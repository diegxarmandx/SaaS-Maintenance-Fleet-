"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  passwordResetCompletionSchema,
  type PasswordResetCompletionValues,
} from "@/features/auth/validation/auth";
import { getClientAuthErrorMessage } from "@/features/auth/components/auth-form";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function PasswordResetCompletionForm() {
  const [status, setStatus] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetCompletionValues>({
    resolver: zodResolver(passwordResetCompletionSchema),
    defaultValues: {
      password: "",
    },
  });

  const onSubmit: SubmitHandler<PasswordResetCompletionValues> = async (values) => {
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password: values.password });

      if (error) {
        setStatus(error.message);
        return;
      }

      setStatus("Password updated. You can return to the owner workspace.");
    } catch (error) {
      setStatus(getClientAuthErrorMessage(error));
    }
  };

  return (
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      {status ? (
        <p className="text-sm text-muted" role="status">
          {status}
        </p>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          autoComplete="new-password"
          type="password"
          {...register("password")}
        />
        {errors.password?.message ? (
          <p className="text-sm text-danger" role="status">
            {errors.password.message}
          </p>
        ) : null}
      </div>
      <Button disabled={isSubmitting} type="submit">
        Update password
      </Button>
    </form>
  );
}
