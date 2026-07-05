export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string
          delta_values: Json | null
          entity: string
          entity_id: string | null
          hash: string | null
          id: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          delta_values?: Json | null
          entity: string
          entity_id?: string | null
          hash?: string | null
          id?: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          delta_values?: Json | null
          entity?: string
          entity_id?: string | null
          hash?: string | null
          id?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          color_code: string
          cost_center_code: string | null
          created_at: string
          department_name: string
          id: string
          min_staffing_requirements: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          color_code?: string
          cost_center_code?: string | null
          created_at?: string
          department_name: string
          id?: string
          min_staffing_requirements?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          color_code?: string
          cost_center_code?: string | null
          created_at?: string
          department_name?: string
          id?: string
          min_staffing_requirements?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_departments: {
        Row: {
          id: string
          employee_id: string
          department_id: string
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          department_id: string
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          department_id?: string
          is_primary?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_departments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_skills: {
        Row: {
          acquisition_date: string
          certification_expiry_date: string | null
          created_at: string
          employee_id: string
          id: string
          skill_id: string
        }
        Insert: {
          acquisition_date?: string
          certification_expiry_date?: string | null
          created_at?: string
          employee_id: string
          id?: string
          skill_id: string
        }
        Update: {
          acquisition_date?: string
          certification_expiry_date?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          accumulated_overtime_month: number
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          email: string
          first_name: string
          fte_factor: number
          hire_date: string
          id: string
          last_name: string
          primary_role: Database["public"]["Enums"]["primary_role"]
          remaining_leave_balance: number
          tax_id: string | null
          tenant_id: string
          termination_date: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accumulated_overtime_month?: number
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          email: string
          first_name: string
          fte_factor?: number
          hire_date?: string
          id?: string
          last_name: string
          primary_role: Database["public"]["Enums"]["primary_role"]
          remaining_leave_balance?: number
          tax_id?: string | null
          tenant_id: string
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accumulated_overtime_month?: number
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          email?: string
          first_name?: string
          fte_factor?: number
          hire_date?: string
          id?: string
          last_name?: string
          primary_role?: Database["public"]["Enums"]["primary_role"]
          remaining_leave_balance?: number
          tax_id?: string | null
          tenant_id?: string
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      shift_assignments: {
        Row: {
          actual_end_timestamp: string
          actual_start_timestamp: string
          assignment_status: Database["public"]["Enums"]["assignment_status"]
          coverage_type: Database["public"]["Enums"]["coverage_type"]
          created_at: string
          department_id: string
          employee_id: string
          id: string
          notes: string | null
          shift_date: string
          shift_template_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actual_end_timestamp: string
          actual_start_timestamp: string
          assignment_status?: Database["public"]["Enums"]["assignment_status"]
          coverage_type?: Database["public"]["Enums"]["coverage_type"]
          created_at?: string
          department_id: string
          employee_id: string
          id?: string
          notes?: string | null
          shift_date: string
          shift_template_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          actual_end_timestamp?: string
          actual_start_timestamp?: string
          assignment_status?: Database["public"]["Enums"]["assignment_status"]
          coverage_type?: Database["public"]["Enums"]["coverage_type"]
          created_at?: string
          department_id?: string
          employee_id?: string
          id?: string
          notes?: string | null
          shift_date?: string
          shift_template_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_shift_template_id_fkey"
            columns: ["shift_template_id"]
            isOneToOne: false
            referencedRelation: "shift_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_swaps: {
        Row: {
          compliance_report: Json | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          requester_assignment_id: string
          requester_employee_id: string
          status: Database["public"]["Enums"]["swap_status"]
          target_assignment_id: string | null
          target_employee_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          compliance_report?: Json | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          requester_assignment_id: string
          requester_employee_id: string
          status?: Database["public"]["Enums"]["swap_status"]
          target_assignment_id?: string | null
          target_employee_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          compliance_report?: Json | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          requester_assignment_id?: string
          requester_employee_id?: string
          status?: Database["public"]["Enums"]["swap_status"]
          target_assignment_id?: string | null
          target_employee_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_swaps_requester_assignment_id_fkey"
            columns: ["requester_assignment_id"]
            isOneToOne: false
            referencedRelation: "shift_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swaps_requester_employee_id_fkey"
            columns: ["requester_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swaps_target_assignment_id_fkey"
            columns: ["target_assignment_id"]
            isOneToOne: false
            referencedRelation: "shift_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swaps_target_employee_id_fkey"
            columns: ["target_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swaps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_templates: {
        Row: {
          allocated_break_minutes: number
          created_at: string
          end_time: string
          id: string
          is_night_shift: boolean
          shift_code: string
          start_time: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allocated_break_minutes?: number
          created_at?: string
          end_time: string
          id?: string
          is_night_shift?: boolean
          shift_code: string
          start_time: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allocated_break_minutes?: number
          created_at?: string
          end_time?: string
          id?: string
          is_night_shift?: boolean
          shift_code?: string
          start_time?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string
          id: string
          is_mandatory_for_role:
            | Database["public"]["Enums"]["primary_role"]
            | null
          skill_name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_mandatory_for_role?:
            | Database["public"]["Enums"]["primary_role"]
            | null
          skill_name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_mandatory_for_role?:
            | Database["public"]["Enums"]["primary_role"]
            | null
          skill_name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_config: {
        Row: {
          auto_approval_peer_swap: boolean
          forbidden_sequence_matrix: Json
          max_weekly_work_hrs: number
          min_daily_rest_hrs: number
          min_weekly_rest_hrs: number
          night_shift_window: Json
          overtime_threshold_mth_minutes: number
          tenant_id: string
          updated_at: string
          weekly_avg_ref_period_wks: number
        }
        Insert: {
          auto_approval_peer_swap?: boolean
          forbidden_sequence_matrix?: Json
          max_weekly_work_hrs?: number
          min_daily_rest_hrs?: number
          min_weekly_rest_hrs?: number
          night_shift_window?: Json
          overtime_threshold_mth_minutes?: number
          tenant_id: string
          updated_at?: string
          weekly_avg_ref_period_wks?: number
        }
        Update: {
          auto_approval_peer_swap?: boolean
          forbidden_sequence_matrix?: Json
          max_weekly_work_hrs?: number
          min_daily_rest_hrs?: number
          min_weekly_rest_hrs?: number
          night_shift_window?: Json
          overtime_threshold_mth_minutes?: number
          tenant_id?: string
          updated_at?: string
          weekly_avg_ref_period_wks?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenant_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_details: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string | null
          last_name: string | null
          theme_preference: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          last_name?: string | null
          theme_preference?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          last_name?: string | null
          theme_preference?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_tenant_with_owner: {
        Args: { _name: string; _slug: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_role: {
        Args: {
          _roles: Database["public"]["Enums"]["tenant_role"][]
          _tenant: string
          _user: string
        }
        Returns: boolean
      }
      is_tenant_member: {
        Args: { _tenant: string; _user: string }
        Returns: boolean
      }
      delete_tenant: {
        Args: { _tenant_id: string }
        Returns: boolean
      }
      list_all_tenants: {
        Args: Record<string, never>
        Returns: {
          id: string
          name: string
          slug: string
          created_at: string
          member_count: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "viewer"
      assignment_status:
        | "Scheduled"
        | "Approved"
        | "In_Progress"
        | "Completed"
        | "Clocking_Anomaly"
        | "Replaced"
        | "Sick_Leave"
        | "Cancelled"
      contract_type:
        | "Full_Time"
        | "Part_Time"
        | "Freelancer_Locum"
        | "External_Consultant"
      coverage_type:
        | "Regular_Shift"
        | "On_Call_Active"
        | "On_Call_Passive"
        | "Mandatory_Overtime"
      primary_role:
        | "Physician_Attending"
        | "Physician_Resident"
        | "Nurse_Manager"
        | "Nurse_RN"
        | "Nurse_Aide"
        | "Midwife"
        | "Surgeon"
        | "Anesthesiologist"
        | "Pediatrician"
        | "Psychologist"
        | "Physiotherapist"
        | "Lab_Technician"
        | "Radiology_Technician"
      shift_status: "draft" | "published" | "approved"
      swap_status:
        | "Pending_Peer"
        | "Pending_Manager"
        | "Approved"
        | "Declined"
        | "Cancelled"
        | "Auto_Approved"
      tenant_role: "owner" | "manager" | "planner" | "staff" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff", "viewer"],
      assignment_status: [
        "Scheduled",
        "Approved",
        "In_Progress",
        "Completed",
        "Clocking_Anomaly",
        "Replaced",
        "Sick_Leave",
        "Cancelled",
      ],
      contract_type: [
        "Full_Time",
        "Part_Time",
        "Freelancer_Locum",
        "External_Consultant",
      ],
      coverage_type: [
        "Regular_Shift",
        "On_Call_Active",
        "On_Call_Passive",
        "Mandatory_Overtime",
      ],
      primary_role: [
        "Physician_Attending",
        "Physician_Resident",
        "Nurse_Manager",
        "Nurse_RN",
        "Nurse_Aide",
        "Midwife",
      ],
      shift_status: ["draft", "published", "approved"],
      swap_status: [
        "Pending_Peer",
        "Pending_Manager",
        "Approved",
        "Declined",
        "Cancelled",
        "Auto_Approved",
      ],
      tenant_role: ["owner", "manager", "planner", "staff", "viewer"],
    },
  },
} as const
