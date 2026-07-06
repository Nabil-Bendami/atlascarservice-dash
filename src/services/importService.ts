import * as XLSX from "xlsx";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { settingsService } from "@/services/settingsService";
import { mockAgencies, mockCities } from "@/data/mock-data";
import type { AgencyImportRow, CarImportRow } from "@/types";

export type ImportEntity = "agencies" | "cars";

export interface ParsedImportRow {
  [key: string]: string | number;
  rowNumber: number;
}

export interface ImportRowResult<T> {
  data: T;
  errors: string[];
  rowNumber: number;
}

export interface ImportValidationResult<T> {
  columns: string[];
  entity: ImportEntity;
  rows: ImportRowResult<T>[];
  validRows: ImportRowResult<T>[];
}

type CityLookup = {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  region: string;
};

type AgencyLookup = {
  cityId: string;
  cityName: string;
  email: string;
  id: string;
  isBlocked: boolean;
  isSuspended: boolean;
  name: string;
  status: string;
};

const phoneRegex = /^\+?[0-9\s\-()]{8,20}$/;
const agencyRequiredColumns = ["agency_name", "email", "phone", "whatsapp", "city", "address"];
const carRequiredColumns = ["brand", "model", "year", "price_per_day", "city"];

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function asString(value: unknown) {
  return String(value ?? "").trim();
}

function parseBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  const normalized = asString(value).toLowerCase();
  if (["true", "yes", "1", "verified"].includes(normalized)) return true;
  if (["false", "no", "0", "pending"].includes(normalized)) return false;
  return undefined;
}

function parseNumber(value: unknown) {
  const normalized = asString(value);
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function parseSpreadsheet(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
  const columns = rawRows.length ? Object.keys(rawRows[0]).map(normalizeHeader) : [];

  const rows = rawRows.map((row, index) => {
    const normalizedRow: ParsedImportRow = { rowNumber: index + 2 };
    Object.entries(row).forEach(([key, value]) => {
      normalizedRow[normalizeHeader(key)] = asString(value);
    });
    return normalizedRow;
  });

  return { columns, rows };
}

async function loadCitiesLookup() {
  if (!isSupabaseConfigured) {
    return mockCities.reduce<Record<string, CityLookup>>((accumulator, city) => {
      accumulator[city.name.toLowerCase()] = {
        id: city.id,
        latitude: city.latitude,
        longitude: city.longitude,
        name: city.name,
        region: city.region,
      };
      return accumulator;
    }, {});
  }

  const { data, error } = await supabase.from("owner_cities_view").select("id, name, region, latitude, longitude");
  if (error) throw error;

  return (data ?? []).reduce<Record<string, CityLookup>>((accumulator, row) => {
    accumulator[String(row.name).toLowerCase()] = {
      id: String(row.id),
      latitude: Number(row.latitude ?? 0),
      longitude: Number(row.longitude ?? 0),
      name: String(row.name ?? ""),
      region: String(row.region ?? ""),
    };
    return accumulator;
  }, {});
}

async function loadAgencyLookup(includeBlocked = true) {
  if (!isSupabaseConfigured) {
    return mockAgencies.reduce<Record<string, AgencyLookup>>((accumulator, agency) => {
      accumulator[`name:${agency.name.toLowerCase()}`] = {
        cityId: agency.cityId,
        cityName: agency.cityName,
        email: agency.email,
        id: agency.id,
        isBlocked: agency.isBlocked,
        isSuspended: agency.isSuspended,
        name: agency.name,
        status: agency.status,
      };
      accumulator[`email:${agency.email.toLowerCase()}`] = accumulator[`name:${agency.name.toLowerCase()}`];
      return accumulator;
    }, {});
  }

  let query = supabase.from("owner_agencies_view").select("id, name, email, city_id, city_name, status, is_blocked, is_suspended");
  if (!includeBlocked) {
    query = query.eq("status", "active").eq("is_blocked", false).eq("is_suspended", false);
  }
  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).reduce<Record<string, AgencyLookup>>((accumulator, row) => {
    const entry: AgencyLookup = {
      cityId: String(row.city_id ?? ""),
      cityName: String(row.city_name ?? ""),
      email: String(row.email ?? ""),
      id: String(row.id),
      isBlocked: Boolean(row.is_blocked ?? false),
      isSuspended: Boolean(row.is_suspended ?? row.status === "suspended"),
      name: String(row.name ?? ""),
      status: String(row.status ?? "active"),
    };
    if (entry.name) accumulator[`name:${entry.name.toLowerCase()}`] = entry;
    if (entry.email) accumulator[`email:${entry.email.toLowerCase()}`] = entry;
    return accumulator;
  }, {});
}

function validateRequiredColumns(columns: string[], requiredColumns: string[]) {
  return requiredColumns.filter((column) => !columns.includes(column));
}

export const importService = {
  async parseFile(file: File, entity: ImportEntity) {
    const parsed = await parseSpreadsheet(file);
    const missingColumns = validateRequiredColumns(parsed.columns, entity === "agencies" ? agencyRequiredColumns : carRequiredColumns);
    if (missingColumns.length) {
      throw new Error(`The import file is missing required columns: ${missingColumns.join(", ")}`);
    }
    return parsed;
  },

  downloadTemplate(entity: ImportEntity) {
    const sampleRows =
      entity === "agencies"
        ? [
            {
              agency_name: "Atlas Premium Cars",
              email: "agency@example.com",
              phone: "+212600000000",
              whatsapp: "+212600000000",
              city: "Casablanca",
              address: "Boulevard d'Anfa, Casablanca",
              description: "Premium fleet and airport delivery",
              status: "active",
              is_verified: "true",
              logo_url: "https://example.com/logo.png",
              cover_image_url: "https://example.com/cover.png",
            },
          ]
        : [
            {
              agency_name: "Atlas Premium Cars",
              agency_email: "agency@example.com",
              brand: "Toyota",
              model: "Corolla",
              year: 2024,
              price_per_day: 600,
              city: "Casablanca",
              transmission: "automatic",
              fuel_type: "hybrid",
              seats: 5,
              image_url: "https://example.com/car.png",
              availability_status: "available",
              description: "Clean city car",
            },
          ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, entity === "agencies" ? "agencies" : "cars");
    XLSX.writeFile(workbook, entity === "agencies" ? "agency-import-template.xlsx" : "car-import-template.xlsx");
  },

  async validateAgencyRows(rows: ParsedImportRow[], columns: string[]): Promise<ImportValidationResult<AgencyImportRow>> {
    const [citiesLookup, agencyLookup] = await Promise.all([loadCitiesLookup(), loadAgencyLookup(true)]);
    const seenEmails = new Set<string>();
    const seenNames = new Set<string>();

    const results = rows.map<ImportRowResult<AgencyImportRow>>((row) => {
      const agencyName = asString(row.agency_name);
      const email = asString(row.email);
      const phone = asString(row.phone);
      const whatsapp = asString(row.whatsapp);
      const city = asString(row.city);
      const address = asString(row.address);
      const description = asString(row.description);
      const status = asString(row.status);
      const isVerified = asString(row.is_verified);
      const logoUrl = asString(row.logo_url);
      const coverImageUrl = asString(row.cover_image_url);
      const normalizedEmail = email.toLowerCase();
      const normalizedName = agencyName.toLowerCase();
      const errors: string[] = [];

      if (!agencyName) errors.push("agency_name is required.");
      if (!email || !email.includes("@")) errors.push("A valid email is required.");
      if (!phone || !phoneRegex.test(phone)) errors.push("A valid phone is required.");
      if (!whatsapp || !phoneRegex.test(whatsapp)) errors.push("A valid WhatsApp number is required.");
      if (!city) errors.push("city is required.");
      if (!address) errors.push("address is required.");

      if (city && !citiesLookup[city.toLowerCase()]) {
        errors.push(`City "${city}" does not exist in the platform city list.`);
      }

      if (normalizedEmail) {
        if (seenEmails.has(normalizedEmail)) errors.push("Duplicate email in this import file.");
        if (agencyLookup[`email:${normalizedEmail}`]) errors.push("An agency with this email already exists.");
        seenEmails.add(normalizedEmail);
      }

      if (normalizedName) {
        if (seenNames.has(normalizedName)) errors.push("Duplicate agency name in this import file.");
        if (agencyLookup[`name:${normalizedName}`]) errors.push("An agency with this name already exists.");
        seenNames.add(normalizedName);
      }

      if (status && !["active", "suspended"].includes(status.toLowerCase())) {
        errors.push('status must be "active" or "suspended".');
      }

      return {
        rowNumber: row.rowNumber,
        data: {
          rowNumber: row.rowNumber,
          agency_name: agencyName,
          email,
          phone,
          whatsapp,
          city,
          address,
          description,
          status,
          is_verified: isVerified,
          logo_url: logoUrl,
          cover_image_url: coverImageUrl,
        },
        errors,
      };
    });

    return {
      columns,
      entity: "agencies",
      rows: results,
      validRows: results.filter((row) => row.errors.length === 0),
    };
  },

  async importAgencyRows(result: ImportValidationResult<AgencyImportRow>) {
    const [citiesLookup, profile] = await Promise.all([loadCitiesLookup(), settingsService.getCurrentOwnerProfile()]);
    let successCount = 0;
    const failedRows: { rowNumber: number; reason: string }[] = [];

    for (const row of result.validRows) {
      const city = citiesLookup[row.data.city.toLowerCase()];

      try {
        const insertResult = await supabase
          .from("agencies")
          .insert({
            owner_user_id: null,
            email: row.data.email,
            name: row.data.agency_name,
            city_id: city ? Number(city.id) : null,
            region: city?.region ?? null,
            address: row.data.address,
            phone: row.data.phone,
            whatsapp: row.data.whatsapp,
            description: row.data.description ?? null,
            status: row.data.status?.toLowerCase() === "suspended" ? "suspended" : "active",
            is_verified: parseBoolean(row.data.is_verified) ?? true,
            is_blocked: row.data.status?.toLowerCase() === "suspended",
            is_suspended: row.data.status?.toLowerCase() === "suspended",
            logo_url: row.data.logo_url || null,
            cover_url: row.data.cover_image_url || null,
            latitude: city?.latitude ?? null,
            longitude: city?.longitude ?? null,
          })
          .select("id")
          .single();

        if (insertResult.error || !insertResult.data?.id) {
          throw insertResult.error ?? new Error("Agency insert failed.");
        }

        const agencyId = String(insertResult.data.id);
        const permissionsResult = await supabase.from("agency_permissions").insert({ agency_id: agencyId });
        if (permissionsResult.error) throw permissionsResult.error;

        await supabase.from("admin_audit_logs").insert({
          owner_id: profile.id,
          action: "import_agency",
          target_type: "agency",
          target_id: agencyId,
          details: { source: "excel_import", row_number: row.rowNumber },
        });

        successCount += 1;
      } catch (error) {
        console.error("[agency-import] row failed", { row, error });
        failedRows.push({
          rowNumber: row.rowNumber,
          reason: error instanceof Error ? error.message : "Import failed.",
        });
      }
    }

    return { failedRows, successCount };
  },

  async validateCarRows(rows: ParsedImportRow[], columns: string[]): Promise<ImportValidationResult<CarImportRow>> {
    const [citiesLookup, agencyLookup] = await Promise.all([loadCitiesLookup(), loadAgencyLookup(false)]);

    const results = rows.map<ImportRowResult<CarImportRow>>((row) => {
      const agencyName = asString(row.agency_name);
      const agencyEmail = asString(row.agency_email);
      const brand = asString(row.brand);
      const model = asString(row.model);
      const city = asString(row.city);
      const transmission = asString(row.transmission);
      const fuelType = asString(row.fuel_type);
      const imageUrl = asString(row.image_url);
      const availabilityStatus = asString(row.availability_status);
      const description = asString(row.description);
      const year = asString(row.year);
      const pricePerDay = asString(row.price_per_day);
      const seats = asString(row.seats);
      const errors: string[] = [];
      const agencyKey = agencyEmail ? `email:${agencyEmail.toLowerCase()}` : agencyName ? `name:${agencyName.toLowerCase()}` : null;
      const agency = agencyKey ? agencyLookup[agencyKey] : null;

      if (!agencyName && !agencyEmail) errors.push("agency_name or agency_email is required.");
      if (!brand) errors.push("brand is required.");
      if (!model) errors.push("model is required.");
      if (!city) errors.push("city is required.");
      if (!parseNumber(year)) errors.push("year must be a valid number.");
      if (!parseNumber(pricePerDay)) errors.push("price_per_day must be a valid number.");

      if (city && !citiesLookup[city.toLowerCase()]) {
        errors.push(`City "${city}" does not exist in the platform city list.`);
      }

      if (!agency) {
        errors.push("Agency was not found by name/email, or it is inactive/blocked.");
      } else if (agency.isBlocked || agency.status !== "active") {
        errors.push("Cars cannot be imported into blocked or inactive agencies.");
      }

      if (availabilityStatus && !["available", "rented", "maintenance"].includes(availabilityStatus.toLowerCase())) {
        errors.push('availability_status must be "available", "rented", or "maintenance".');
      }

      if (imageUrl) {
        try {
          new URL(imageUrl);
        } catch {
          errors.push("image_url must be a valid URL.");
        }
      }

      return {
        rowNumber: row.rowNumber,
        data: {
          rowNumber: row.rowNumber,
          agency_name: agencyName,
          agency_email: agencyEmail,
          brand,
          model,
          year,
          price_per_day: pricePerDay,
          city,
          transmission,
          fuel_type: fuelType,
          seats,
          image_url: imageUrl,
          availability_status: availabilityStatus,
          description,
        },
        errors,
      };
    });

    return {
      columns,
      entity: "cars",
      rows: results,
      validRows: results.filter((row) => row.errors.length === 0),
    };
  },

  async importCarRows(result: ImportValidationResult<CarImportRow>) {
    const [agencyLookup, profile] = await Promise.all([loadAgencyLookup(false), settingsService.getCurrentOwnerProfile()]);
    let successCount = 0;
    const failedRows: { rowNumber: number; reason: string }[] = [];

    for (const row of result.validRows) {
      const agencyKey = row.data.agency_email
        ? `email:${row.data.agency_email.toLowerCase()}`
        : `name:${row.data.agency_name?.toLowerCase() ?? ""}`;
      const agency = agencyLookup[agencyKey];

      try {
        if (!agency) {
          throw new Error("Agency lookup failed during import.");
        }

        const insertResult = await supabase
          .from("cars")
          .insert({
            agency_id: agency.id,
            brand: row.data.brand,
            model: row.data.model,
            year: parseNumber(row.data.year) ?? null,
            price_per_day: parseNumber(row.data.price_per_day) ?? 0,
            availability: row.data.availability_status?.toLowerCase() || "available",
            status: "active",
            transmission: row.data.transmission || null,
            fuel_type: row.data.fuel_type || null,
            seats: parseNumber(row.data.seats) ?? null,
            description: row.data.description || null,
          })
          .select("id")
          .single();

        if (insertResult.error || !insertResult.data?.id) {
          throw insertResult.error ?? new Error("Car insert failed.");
        }

        if (row.data.image_url) {
          const imageResult = await supabase.from("car_images").insert({
            car_id: insertResult.data.id,
            image_url: row.data.image_url,
          });
          if (imageResult.error) throw imageResult.error;
        }

        await supabase.from("admin_audit_logs").insert({
          owner_id: profile.id,
          action: "import_car",
          target_type: "car",
          target_id: insertResult.data.id,
          details: { source: "excel_import", row_number: row.rowNumber },
        });

        successCount += 1;
      } catch (error) {
        console.error("[car-import] row failed", { row, error });
        failedRows.push({
          rowNumber: row.rowNumber,
          reason: error instanceof Error ? error.message : "Import failed.",
        });
      }
    }

    return { failedRows, successCount };
  },
};
