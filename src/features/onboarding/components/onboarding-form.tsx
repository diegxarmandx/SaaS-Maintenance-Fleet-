"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler, type UseFormRegisterReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  completeOnboardingAction,
  type OnboardingActionResult,
} from "@/features/onboarding/actions";
import {
  companyOnboardingSchema,
  type CompanyOnboardingValues,
} from "@/features/onboarding/validation/onboarding";

export function OnboardingForm() {
  const [result, setResult] = useState<OnboardingActionResult | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanyOnboardingValues>({
    resolver: zodResolver(companyOnboardingSchema),
    defaultValues: {
      companyName: "",
      ownerName: "",
      phone: "",
      email: "",
      address: "",
      preferredTimezone: "America/Puerto_Rico",
      distanceUnit: "miles",
      engineHourTracking: true,
    },
  });

  const onSubmit: SubmitHandler<CompanyOnboardingValues> = async (values) => {
    setResult(await completeOnboardingAction(values));
  };

  return (
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      {result ? (
        <p className="text-sm text-danger" role="status">
          {result.message}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          error={errors.companyName?.message}
          id="company-name"
          label="Company name"
          registration={register("companyName")}
        />
        <TextField
          error={errors.ownerName?.message}
          id="owner-name"
          label="Owner name"
          registration={register("ownerName")}
        />
        <TextField
          error={errors.phone?.message}
          id="company-phone"
          label="Phone"
          registration={register("phone")}
          type="tel"
        />
        <TextField
          error={errors.email?.message}
          id="company-email"
          label="Company email"
          registration={register("email")}
          type="email"
        />
      </div>
      <TextField
        error={errors.address?.message}
        id="company-address"
        label="Address"
        registration={register("address")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          error={errors.preferredTimezone?.message}
          id="company-timezone"
          label="Preferred timezone"
          registration={register("preferredTimezone")}
        />
        <div className="grid gap-2">
          <Label htmlFor="distance-unit">Distance unit</Label>
          <select
            id="distance-unit"
            className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground shadow-sm"
            {...register("distanceUnit")}
          >
            <option value="miles">Miles</option>
            <option value="kilometers">Kilometers</option>
          </select>
        </div>
      </div>
      <label className="flex items-start gap-3 rounded-lg border border-border bg-background p-3 text-sm text-foreground">
        <input className="mt-1" type="checkbox" {...register("engineHourTracking")} />
        Track engine hours for equipment and assets that report hours.
      </label>
      <Button disabled={isSubmitting} type="submit">
        Create company workspace
      </Button>
    </form>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
  error?: string | undefined;
  type?: string | undefined;
};

function TextField({ id, label, registration, error, type = "text" }: TextFieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} {...registration} />
      {error ? (
        <p className="text-sm text-danger" role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}
