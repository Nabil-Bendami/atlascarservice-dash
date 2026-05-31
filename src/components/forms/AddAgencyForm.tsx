import { useState } from "react";
import { CheckCircle2, KeyRound, MapPin, Phone, ShieldCheck, UserCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { agencyService } from "@/services/agencyService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  agencyName: z.string().min(2),
  logo: z.string().url(),
  coverImage: z.string().url(),
  city: z.string().min(2),
  region: z.string().min(2),
  address: z.string().min(4),
  phone: z.string().min(6),
  whatsapp: z.string().min(6),
  description: z.string().min(10),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  status: z.enum(["active", "suspended"]),
  verified: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function AddAgencyForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      status: "active",
      verified: true,
      latitude: 33.5731,
      longitude: -7.5898,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    setError(null);

    try {
      const agency = await agencyService.createAgencyWithAuth(values);
      setMessage(`${agency.name} created successfully.`);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agency");
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create agency</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-6" onSubmit={onSubmit}>
          <Section title="Account information" icon={KeyRound}>
            <Field label="Email" error={errors.email?.message}><Input {...register("email")} placeholder="agency@example.com" /></Field>
            <Field label="Password" error={errors.password?.message}><Input type="password" {...register("password")} placeholder="Minimum 8 characters" /></Field>
          </Section>

          <Section title="Agency information" icon={UserCircle2}>
            <Field label="Agency name" error={errors.agencyName?.message}><Input {...register("agencyName")} /></Field>
            <Field label="Logo URL" error={errors.logo?.message}><Input {...register("logo")} /></Field>
            <Field label="Cover image URL" error={errors.coverImage?.message}><Input {...register("coverImage")} /></Field>
            <div className="md:col-span-2">
              <Field label="Description" error={errors.description?.message}>
                <Textarea {...register("description")} placeholder="Describe the agency, fleet quality, and services." />
              </Field>
            </div>
          </Section>

          <Section title="Contact information" icon={Phone}>
            <Field label="Phone" error={errors.phone?.message}><Input {...register("phone")} /></Field>
            <Field label="WhatsApp" error={errors.whatsapp?.message}><Input {...register("whatsapp")} /></Field>
          </Section>

          <Section title="Location information" icon={MapPin}>
            <Field label="City" error={errors.city?.message}><Input {...register("city")} /></Field>
            <Field label="Region" error={errors.region?.message}><Input {...register("region")} /></Field>
            <div className="md:col-span-2">
              <Field label="Address" error={errors.address?.message}><Input {...register("address")} /></Field>
            </div>
            <Field label="Latitude" error={errors.latitude?.message}><Input type="number" step="0.0001" {...register("latitude")} /></Field>
            <Field label="Longitude" error={errors.longitude?.message}><Input type="number" step="0.0001" {...register("longitude")} /></Field>
          </Section>

          <Section title="Permissions" icon={ShieldCheck}>
            <Field label="Status" error={errors.status?.message}>
              <Select defaultValue={watch("status")} onValueChange={(value) => setValue("status", value as "active" | "suspended")}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="space-y-3">
              <Label>Verification</Label>
              <div className="flex h-11 items-center gap-3 rounded-2xl border border-border bg-slate-50 px-4">
                <Checkbox checked={watch("verified")} onCheckedChange={(value) => setValue("verified", Boolean(value))} />
                <span className="text-sm text-slate-700">Agency is verified</span>
              </div>
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
            <Button size="lg" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating agency..." : "Create agency"}
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
  error?: string;
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
