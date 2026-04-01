export type DeliveryStatus =
  | "pending"
  | "broadcasted"
  | "accepted"
  | "collecting"
  | "in_route"
  | "completed"
  | "cancelled";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  status: "pending" | "active" | "rejected";
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Driver {
  id: string;
  user_id: string;
  vehicle: string;
  plate: string | null;
  is_online: boolean;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  created_at: string;
  profiles?: Profile;
}

export interface Delivery {
  id: string;
  company_id: string;
  driver_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  pickup_address: string;
  delivery_address: string;
  value: number;
  status: DeliveryStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  companies?: Company;
  drivers?: Driver;
}

export interface Region {
  id: string;
  name: string;
  color: string;
  geometry: unknown;
  is_active: boolean;
  created_at: string;
}

export interface Occurrence {
  id: string;
  delivery_id: string;
  driver_id: string | null;
  type: string;
  description: string;
  status: string;
  created_at: string;
}

export interface Review {
  id: string;
  delivery_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}
