export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      alerts: {
        Row: {
          id: string
          user_id: string
          type: string
          severity: string
          title: string
          description: string
          latitude: number
          longitude: number
          address: string | null
          created_at: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          severity: string
          title: string
          description: string
          latitude: number
          longitude: number
          address?: string | null
          created_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          severity?: string
          title?: string
          description?: string
          latitude?: number
          longitude?: number
          address?: string | null
          created_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          metadata?: Json | null
        }
      }
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string
          avatar_url: string | null
          created_at: string
          updated_at: string
          phone_number: string | null
          emergency_contact: string | null
          medical_info: string | null
          blood_type: string | null
          allergies: string | null
          medications: string | null
          insurance_info: string | null
        }
        Insert: {
          id: string
          username: string
          full_name: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          phone_number?: string | null
          emergency_contact?: string | null
          medical_info?: string | null
          blood_type?: string | null
          allergies?: string | null
          medications?: string | null
          insurance_info?: string | null
        }
        Update: {
          id?: string
          username?: string
          full_name?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          phone_number?: string | null
          emergency_contact?: string | null
          medical_info?: string | null
          blood_type?: string | null
          allergies?: string | null
          medications?: string | null
          insurance_info?: string | null
        }
      }
      trusted_contacts: {
        Row: {
          id: string
          user_id: string
          contact_name: string
          contact_phone: string
          contact_email: string | null
          relationship: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          contact_name: string
          contact_phone: string
          contact_email?: string | null
          relationship: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          contact_name?: string
          contact_phone?: string
          contact_email?: string | null
          relationship?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_locations: {
        Row: {
          id: string
          user_id: string
          latitude: number
          longitude: number
          accuracy: number | null
          altitude: number | null
          speed: number | null
          heading: number | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          latitude: number
          longitude: number
          accuracy?: number | null
          altitude?: number | null
          speed?: number | null
          heading?: number | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          latitude?: number
          longitude?: number
          accuracy?: number | null
          altitude?: number | null
          speed?: number | null
          heading?: number | null
          updated_at?: string
        }
      }
      safety_groups: {
        Row: {
          id: string
          name: string
          description: string
          created_by: string
          privacy_level: 'public' | 'private' | 'invite_only'
          created_at: string
          updated_at: string
          invite_code: string | null
          max_members: number
          emergency_contacts: Json | null
          group_rules: Json | null
        }
        Insert: {
          id?: string
          name: string
          description: string
          created_by: string
          privacy_level: 'public' | 'private' | 'invite_only'
          created_at?: string
          updated_at?: string
          invite_code?: string | null
          max_members?: number
          emergency_contacts?: Json | null
          group_rules?: Json | null
        }
        Update: {
          id?: string
          name?: string
          description?: string
          created_by?: string
          privacy_level?: 'public' | 'private' | 'invite_only'
          created_at?: string
          updated_at?: string
          invite_code?: string | null
          max_members?: number
          emergency_contacts?: Json | null
          group_rules?: Json | null
        }
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: string
          joined_at: string
          last_active: string | null
          notifications_enabled: boolean
          location_sharing_enabled: boolean
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          role: string
          joined_at?: string
          last_active?: string | null
          notifications_enabled?: boolean
          location_sharing_enabled?: boolean
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          role?: string
          joined_at?: string
          last_active?: string | null
          notifications_enabled?: boolean
          location_sharing_enabled?: boolean
        }
      }
      group_messages: {
        Row: {
          id: string
          group_id: string
          sender_id: string
          message: string
          message_type: 'text' | 'alert' | 'emergency' | 'location'
          metadata: Json | null
          created_at: string
          edited_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          group_id: string
          sender_id: string
          message: string
          message_type: 'text' | 'alert' | 'emergency' | 'location'
          metadata?: Json | null
          created_at?: string
          edited_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          sender_id?: string
          message?: string
          message_type?: 'text' | 'alert' | 'emergency' | 'location'
          metadata?: Json | null
          created_at?: string
          edited_at?: string | null
          deleted_at?: string | null
        }
      }
      group_locations: {
        Row: {
          id: string
          group_id: string
          user_id: string
          latitude: number
          longitude: number
          accuracy: number | null
          is_emergency: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          latitude: number
          longitude: number
          accuracy?: number | null
          is_emergency?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          latitude?: number
          longitude?: number
          accuracy?: number | null
          is_emergency?: boolean
          updated_at?: string
        }
      }
      group_checkins: {
        Row: {
          id: string
          group_id: string
          user_id: string
          status: 'safe' | 'need_help' | 'emergency'
          message: string | null
          latitude: number | null
          longitude: number | null
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          status: 'safe' | 'need_help' | 'emergency'
          message?: string | null
          latitude?: number | null
          longitude?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          status?: 'safe' | 'need_help' | 'emergency'
          message?: string | null
          latitude?: number | null
          longitude?: number | null
          created_at?: string
        }
      }
      group_routes: {
        Row: {
          id: string
          group_id: string
          user_id: string
          title: string
          start_location: Json
          end_location: Json
          waypoints: Json | null
          estimated_arrival: string | null
          actual_arrival: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          title: string
          start_location: Json
          end_location: Json
          waypoints?: Json | null
          estimated_arrival?: string | null
          actual_arrival?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          title?: string
          start_location?: Json
          end_location?: Json
          waypoints?: Json | null
          estimated_arrival?: string | null
          actual_arrival?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      vibe_history: {
        Row: {
          id: string
          user_id: string
          vibe: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          vibe: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          vibe?: string
          created_at?: string
        }
      }
      saved_places: {
        Row: {
          id: string
          user_id: string
          name: string
          address: string
          latitude: number
          longitude: number
          icon: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          address: string
          latitude: number
          longitude: number
          icon?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          address?: string
          latitude?: number
          longitude?: number
          icon?: string
          created_at?: string
          updated_at?: string
        }
      }
      sos_history: {
        Row: {
          id: string
          user_id: string
          latitude: number
          longitude: number
          address: string | null
          triggered_at: string
          resolved_at: string | null
          false_alarm: boolean
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          latitude: number
          longitude: number
          address?: string | null
          triggered_at?: string
          resolved_at?: string | null
          false_alarm?: boolean
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          latitude?: number
          longitude?: number
          address?: string | null
          triggered_at?: string
          resolved_at?: string | null
          false_alarm?: boolean
          notes?: string | null
        }
      }
      guardian_angels: {
        Row: {
          id: string
          user_id: string
          guardian_id: string
          status: 'pending' | 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          guardian_id: string
          status?: 'pending' | 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          guardian_id?: string
          status?: 'pending' | 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
      }
      guardian_invitations: {
        Row: {
          id: string
          inviter_id: string
          guardian_email: string
          invitation_token: string
          status: 'pending' | 'accepted' | 'expired'
          expires_at: string
          created_at: string
          accepted_at: string | null
          accepted_by: string | null
        }
        Insert: {
          id?: string
          inviter_id: string
          guardian_email: string
          invitation_token?: string
          status?: 'pending' | 'accepted' | 'expired'
          expires_at?: string
          created_at?: string
          accepted_at?: string | null
          accepted_by?: string | null
        }
        Update: {
          id?: string
          inviter_id?: string
          guardian_email?: string
          invitation_token?: string
          status?: 'pending' | 'accepted' | 'expired'
          expires_at?: string
          created_at?: string
          accepted_at?: string | null
          accepted_by?: string | null
        }
      }
      guardian_check_ins: {
        Row: {
          id: string
          user_id: string
          guardian_id: string
          message: string | null
          location: Json | null
          status: 'sent' | 'acknowledged'
          acknowledged_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          guardian_id: string
          message?: string | null
          location?: Json | null
          status?: 'sent' | 'acknowledged'
          acknowledged_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          guardian_id?: string
          message?: string | null
          location?: Json | null
          status?: 'sent' | 'acknowledged'
          acknowledged_at?: string | null
          created_at?: string
        }
      }
      guardian_alerts: {
        Row: {
          id: string
          user_id: string
          guardian_id: string
          alert_type: 'sos' | 'low_vibe' | 'location_change' | 'check_in_request'
          message: string | null
          location: Json | null
          vibe_score: number | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          guardian_id: string
          alert_type: 'sos' | 'low_vibe' | 'location_change' | 'check_in_request'
          message?: string | null
          location?: Json | null
          vibe_score?: number | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          guardian_id?: string
          alert_type?: 'sos' | 'low_vibe' | 'location_change' | 'check_in_request'
          message?: string | null
          location?: Json | null
          vibe_score?: number | null
          is_read?: boolean
          created_at?: string
        }
      }
      geofences: {
        Row: {
          id: string
          user_id: string
          name: string
          latitude: number
          longitude: number
          radius: number
          trigger_on_enter: boolean
          trigger_on_exit: boolean
          is_active: boolean
          notification_message: string | null
          vibe: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          latitude: number
          longitude: number
          radius: number
          trigger_on_enter?: boolean
          trigger_on_exit?: boolean
          is_active?: boolean
          notification_message?: string | null
          vibe?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          latitude?: number
          longitude?: number
          radius?: number
          trigger_on_enter?: boolean
          trigger_on_exit?: boolean
          is_active?: boolean
          notification_message?: string | null
          vibe?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      send_guardian_invitation: {
        Args: {
          p_guardian_email: string
        }
        Returns: Json
      }
      accept_guardian_invitation: {
        Args: {
          p_invitation_token: string
        }
        Returns: Json
      }
      get_my_guardians: {
        Args: Record<PropertyKey, never>
        Returns: Array<{
          id: string
          guardian_id: string
          guardian_email: string
          guardian_name: string
          status: string
          created_at: string
        }>
      }
      get_protected_users: {
        Args: Record<PropertyKey, never>
        Returns: Array<{
          id: string
          user_id: string
          user_email: string
          user_name: string
          status: string
          created_at: string
        }>
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
