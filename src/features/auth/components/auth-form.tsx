"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  requestPasswordResetAction,
  signInAction,
  signUpAction,
  type AuthActionResult,
} from "@/features/auth/actions";
import {
  loginFormSchema,
  passwordResetRequestSchema,
  signupFormSchema,
  type LoginFormValues,
  type PasswordResetRequestValues,
  type SignupFormValues,
} from "@/features/auth/validation/auth";
import { getErrorMessage } from "@/lib/errors";

type SignupPlanOption = {
  key: string;
  name: string;
  assetRangeLabel: string;
  suggestedMonthlyPrice: string;
};

export function LoginForm({ redirectTo }: { redirectTo?: string | null | undefined }) {
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (values) => {
    setResult(await signInAction(values, redirectTo));
  };

  return (
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormStatus result={result} />
      <div className="grid gap-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          autoComplete="email"
          inputMode="email"
          type="email"
          {...register("email")}
        />
        <FieldError message={errors.email?.message} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          autoComplete="current-password"
          type="password"
          {...register("password")}
        />
        <FieldError message={errors.password?.message} />
      </div>
      <Button disabled={isSubmitting} type="submit">
        Sign in
      </Button>
    </form>
  );
}

export function SignupForm({
  planKey,
  planOptions = [],
}: {
  planKey?: string | null | undefined;
  planOptions?: SignupPlanOption[];
}) {
  const defaultPlanKey = planKey ?? planOptions[0]?.key ?? "";
  const [selectedPlanKey, setSelectedPlanKey] = useState(defaultPlanKey);
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      ownerName: "",
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<SignupFormValues> = async (values) => {
    setResult(await signUpAction(values, selectedPlanKey));
  };

  return (
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormStatus result={result} />
      <div className="grid gap-2">
        <Label htmlFor="signup-plan">Preferred plan</Label>
        <Select
          id="signup-plan"
          name="plan"
          onChange={(event) => setSelectedPlanKey(event.target.value)}
          value={selectedPlanKey}
        >
          {planOptions.map((plan) => (
            <option key={plan.key} value={plan.key}>
              {plan.name} · {plan.assetRangeLabel} · {plan.suggestedMonthlyPrice}
            </option>
          ))}
        </Select>
        <p className="text-xs leading-5 text-muted">
          You can change this before checkout. Free does not require Stripe.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="signup-owner-name">Owner name</Label>
        <Input
          id="signup-owner-name"
          autoComplete="name"
          type="text"
          {...register("ownerName")}
        />
        <FieldError message={errors.ownerName?.message} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          autoComplete="email"
          inputMode="email"
          type="email"
          {...register("email")}
        />
        <FieldError message={errors.email?.message} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          autoComplete="new-password"
          type="password"
          {...register("password")}
        />
        <FieldError message={errors.password?.message} />
      </div>
      <Button disabled={isSubmitting || result?.status === "success"} type="submit">
        {result?.status === "success" ? "Confirmation email sent" : "Create account"}
      </Button>
    </form>
  );
}

export function PasswordResetRequestForm() {
  const [result, setResult] = useState<AuthActionResult | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetRequestValues>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit: SubmitHandler<PasswordResetRequestValues> = async (values) => {
    setResult(await requestPasswordResetAction(values));
  };

  return (
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormStatus result={result} />
      <div className="grid gap-2">
        <Label htmlFor="reset-request-email">Email</Label>
        <Input
          id="reset-request-email"
          autoComplete="email"
          inputMode="email"
          type="email"
          {...register("email")}
        />
        <FieldError message={errors.email?.message} />
      </div>
      <Button disabled={isSubmitting} type="submit">
        Send reset link
      </Button>
    </form>
  );
}

type FieldErrorProps = {
  message?: string | null | undefined;
  tone?: "error" | "info" | undefined;
};

function FieldError({ message, tone = "error" }: FieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={tone === "error" ? "text-sm text-danger" : "text-sm text-muted"}
      role="status"
    >
      {message}
    </p>
  );
}

function FormStatus({ result }: { result: AuthActionResult | null }) {
  if (!result) {
    return null;
  }

  return (
    <p
      className={
        result.status === "error" ? "text-sm text-danger" : "text-sm text-primary"
      }
      role="status"
    >
      {result.message}
    </p>
  );
}

export function getClientAuthErrorMessage(error: unknown) {
  return getErrorMessage(error, "Authentication could not be completed.");
}
