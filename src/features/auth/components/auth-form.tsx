"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  loginFormSchema,
  signupFormSchema,
  type LoginFormValues,
  type SignupFormValues,
} from "@/features/auth/validation/auth";

export function LoginForm() {
  const [status, setStatus] = useState<string | null>(null);
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

  const onSubmit: SubmitHandler<LoginFormValues> = () => {
    setStatus("Supabase sign-in will be connected in the next implementation step.");
  };

  return (
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldError message={status} tone="info" />
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

export function SignupForm() {
  const [status, setStatus] = useState<string | null>(null);
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

  const onSubmit: SubmitHandler<SignupFormValues> = () => {
    setStatus("Supabase sign-up will be connected in the next implementation step.");
  };

  return (
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldError message={status} tone="info" />
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
      <Button disabled={isSubmitting} type="submit">
        Create account
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
