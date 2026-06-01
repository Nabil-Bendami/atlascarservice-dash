import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { CheckCircle2, ImagePlus, KeyRound, MapPin, Phone, UserCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { agencyService } from "@/services/agencyService";
import { cityService } from "@/services/cityService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { City } from "@/types";

const phoneRegex = /^\+?[0-9\s\-()]{8,20}$/;
const maxImageBytes = 5 * 1024 * 1024;

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  agencyName: z.string().min(2, "Agency name is required."),
  phone: z.string().regex(phoneRegex, "Enter a valid phone number."),
  whatsapp: z.string().regex(phoneRegex, "Enter a valid WhatsApp number."),
  cityId: z.string().min(1, "Select a city."),
  address: z.string().min(4, "Address is required."),
  description: z.string().max(1000, "Description is too long.").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

type ImageFieldState = {
  file: File | null;
  previewUrl: string | null;
  error: string | null;
};

const emptyImageFieldState: ImageFieldState = {
  file: null,
  previewUrl: null,
  error: null,
};

function validateImageFile(file: File | null) {
  if (!file) {
    return "This image is required.";
  }

  if (!file.type.startsWith("image/")) {
    return "Only image files are allowed.";
  }

  if (file.size > maxImageBytes) {
    return "Image must be 5MB or smaller.";
  }

  return null;
}

function buildPreviewUrl(file: File | null) {
  return file ? URL.createObjectURL(file) : null;
}

export function AddAgencyForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [citiesError, setCitiesError] = useState<string | null>(null);
  const [logoField, setLogoField] = useState<ImageFieldState>(emptyImageFieldState);
  const [coverField, setCoverField] = useState<ImageFieldState>(emptyImageFieldState);
  const [isUploadingAssets, setIsUploadingAssets] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: "",
    },
  });

  const selectedCityId = watch("cityId");
  const selectedCity = useMemo(
    () => cities.find((city) => city.id === selectedCityId) ?? null,
    [cities, selectedCityId],
  );

  useEffect(() => {
    let active = true;

    async function loadCities() {
      setCitiesLoading(true);
      setCitiesError(null);

      try {
        const data = await cityService.listCities();
        if (!active) return;
        setCities(data);
      } catch (loadError) {
        if (!active) return;
        console.error("[agency:create-form] loadCities failed", loadError);
        setCitiesError(loadError instanceof Error ? loadError.message : "Failed to load cities.");
      } finally {
        if (active) {
          setCitiesLoading(false);
        }
      }
    }

    void loadCities();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (logoField.previewUrl) URL.revokeObjectURL(logoField.previewUrl);
      if (coverField.previewUrl) URL.revokeObjectURL(coverField.previewUrl);
    };
  }, [coverField.previewUrl, logoField.previewUrl]);

  function updateImageField(
    file: File | null,
    setter: Dispatch<SetStateAction<ImageFieldState>>,
    currentState: ImageFieldState,
  ) {
    const validationError = validateImageFile(file);
    if (currentState.previewUrl) {
      URL.revokeObjectURL(currentState.previewUrl);
    }

    setter({
      file,
      previewUrl: validationError ? null : buildPreviewUrl(file),
      error: validationError,
    });
  }

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    setError(null);

    const logoError = validateImageFile(logoField.file);
    const coverError = validateImageFile(coverField.file);

    if (logoError || coverError) {
      setLogoField((current) => ({ ...current, error: logoError }));
      setCoverField((current) => ({ ...current, error: coverError }));
      setError("Upload both a logo and a cover image before creating the agency.");
      return;
    }

    if (!selectedCity) {
      setError("Select a city before creating the agency.");
      return;
    }

    setIsUploadingAssets(true);

    try {
      console.log("[agency:create-form] submit:start", {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        cityId: values.cityId,
        cityName: selectedCity.name,
        payload: {
          ...values,
          password: `<redacted length=${values.password.length}>`,
        },
      });

      const [logoUrl, coverUrl] = await Promise.all([
        agencyService.uploadAgencyImage(logoField.file!, "logo"),
        agencyService.uploadAgencyImage(coverField.file!, "cover"),
      ]);

      const agency = await agencyService.createAgencyWithAuth({
        email: values.email,
        password: values.password,
        agencyName: values.agencyName,
        logo: logoUrl,
        coverImage: coverUrl,
        cityId: Number(values.cityId),
        city: selectedCity.name,
        region: selectedCity.region,
        address: values.address,
        phone: values.phone,
        whatsapp: values.whatsapp,
        description: values.description?.trim() || "",
        latitude: selectedCity.latitude,
        longitude: selectedCity.longitude,
        status: "active",
        verified: true,
      });

      console.log("[agency:create-form] submit:success", agency);
      setMessage(`${agency.name} created successfully.`);
      reset();
      setLogoField((current) => {
        if (current.previewUrl) URL.revokeObjectURL(current.previewUrl);
        return emptyImageFieldState;
      });
      setCoverField((current) => {
        if (current.previewUrl) URL.revokeObjectURL(current.previewUrl);
        return emptyImageFieldState;
      });
    } catch (submitError) {
      console.error("[agency:create-form] submit:failure", submitError);
      setError(submitError instanceof Error ? submitError.message : "Failed to create agency.");
    } finally {
      setIsUploadingAssets(false);
    }
  });

  const isBusy = isSubmitting || isUploadingAssets;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create agency</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-6" onSubmit={onSubmit}>
          <input type="hidden" {...register("cityId")} />
          <Section title="Account information" icon={KeyRound}>
            <Field label="Email" error={errors.email?.message}>
              <Input {...register("email")} placeholder="agency@example.com" />
            </Field>
            <Field label="Password" error={errors.password?.message}>
              <Input type="password" {...register("password")} placeholder="Minimum 8 characters" />
            </Field>
          </Section>

          <Section title="Agency information" icon={UserCircle2}>
            <Field label="Agency name" error={errors.agencyName?.message}>
              <Input {...register("agencyName")} placeholder="Atlas Premium Cars" />
            </Field>
            <div className="grid gap-5 md:col-span-2 md:grid-cols-2">
              <FileUploadField
                label="Logo"
                helper="Square logo, JPG or PNG, up to 5MB."
                state={logoField}
                onChange={(file) => updateImageField(file, setLogoField, logoField)}
              />
              <FileUploadField
                label="Cover image"
                helper="Wide cover image, JPG or PNG, up to 5MB."
                state={coverField}
                onChange={(file) => updateImageField(file, setCoverField, coverField)}
              />
            </div>
            <div className="md:col-span-2">
              <Field label="Description" error={errors.description?.message}>
                <Textarea {...register("description")} placeholder="Optional notes about the agency, fleet, or service quality." />
              </Field>
            </div>
          </Section>

          <Section title="Contact information" icon={Phone}>
            <Field label="Phone" error={errors.phone?.message}>
              <Input {...register("phone")} placeholder="+212600000000" />
            </Field>
            <Field label="WhatsApp" error={errors.whatsapp?.message}>
              <Input {...register("whatsapp")} placeholder="+212600000000" />
            </Field>
          </Section>

          <Section title="Location information" icon={MapPin}>
            <Field label="City" error={errors.cityId?.message || citiesError}>
              <Select
                value={selectedCityId}
                onValueChange={(value) => {
                  setValue("cityId", value, { shouldValidate: true, shouldDirty: true });
                }}
              >
                <SelectTrigger disabled={citiesLoading || isBusy}>
                  <SelectValue placeholder={citiesLoading ? "Loading cities..." : "Select a city"} />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Region">
              <Input value={selectedCity?.region ?? ""} readOnly disabled placeholder="Region auto-fills from city" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Address" error={errors.address?.message}>
                <Input
                  {...register("address")}
                  placeholder={selectedCity ? `Street address in ${selectedCity.name}` : "Select a city first"}
                  disabled={!selectedCity}
                />
              </Field>
            </div>
            <div className="md:col-span-2 rounded-2xl border border-dashed border-border bg-white/60 px-4 py-3 text-sm text-muted-foreground">
              {selectedCity
                ? `Coordinates will be saved automatically using ${selectedCity.name}'s default location (${selectedCity.latitude.toFixed(4)}, ${selectedCity.longitude.toFixed(4)}).`
                : "Coordinates will auto-fill from the selected city."}
            </div>
          </Section>

          {message ? (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {message}
            </div>
          ) : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <div className="flex justify-end">
            <Button size="lg" type="submit" disabled={isBusy || citiesLoading}>
              {isUploadingAssets ? "Uploading images..." : isSubmitting ? "Creating agency..." : "Create agency"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-border bg-slate-50/80 p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
      </div>
      <div className="grid gap-5 md:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}

function FileUploadField({
  label,
  helper,
  state,
  onChange,
}: {
  label: string;
  helper: string;
  state: ImageFieldState;
  onChange: (file: File | null) => void;
}) {
  return (
    <Field label={label} error={state.error}>
      <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-border bg-white px-4 py-6 text-center transition hover:border-primary/50 hover:bg-primary/5">
        {state.previewUrl ? (
          <img src={state.previewUrl} alt={`${label} preview`} className="h-28 w-full rounded-2xl object-cover" />
        ) : (
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <ImagePlus className="h-5 w-5" />
          </div>
        )}
        <div>
          <p className="font-semibold text-slate-900">{state.file ? state.file.name : `Upload ${label.toLowerCase()}`}</p>
          <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
        </div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />
      </label>
    </Field>
  );
}
