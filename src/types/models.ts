export type DeliveryStatus = "pending" | "broadcasted" | "accepted" | "collecting" | "in_transit" | "delivered" | "cancelled";

export type OccurrenceType = "motorcycle_issue" | "accident" | "robbery" | "other";

export type UserRole = "admin" | "company" | "driver" | "customer";

export interface Company {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  logo_url: string | null;
  region_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryDriver {
  id: string;
  user_id: string;
  vehicle: string;
  license_plate: string | null;
  commission_rate: number;
  is_online: boolean;
  rating: number;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface Delivery {
  id: string;
  company_id: string;
  driver_id: string | null;
  customer_name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: DeliveryStatus;
  value: number;
  commission: number;
  notes: string | null;
  region_id: string | null;
  accepted_at: string | null;
  collected_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  delivery_id: string;
  driver_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Occurrence {
  id: string;
  driver_id: string;
  delivery_id: string | null;
  type: OccurrenceType;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}
