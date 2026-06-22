export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          company_id: string | null;
          onboarding_status: "incomplete" | "complete";
          created_at: string;
          updated_at: string;
        };
      };
      companies: {
        Row: {
          id: string;
          company_name: string;
          owner_name: string;
          phone: string | null;
          email: string;
          address: string | null;
          preferred_timezone: string;
          preferred_measurement_settings: Json;
          subscription_status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          created_at: string;
          updated_at: string;
        };
      };
    };
    Functions: {
      complete_company_onboarding: {
        Args: {
          p_company_name: string;
          p_owner_name: string;
          p_phone: string;
          p_email: string;
          p_address: string;
          p_preferred_timezone: string;
          p_preferred_measurement_settings: Json;
        };
        Returns: string;
      };
      update_owner_profile_name: {
        Args: {
          p_full_name: string;
        };
        Returns: undefined;
      };
    };
  };
};
