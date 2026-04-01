import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function useReviews() {
  return useQuery({
    queryKey: ["reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, delivery_drivers!reviews_driver_id_fkey(user_id, profiles:user_id(full_name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export default function ReviewsPage() {
  const { data: reviews, isLoading } = useReviews();

  return (
    <AdminLayout title="Avaliações" subtitle="Avaliações de entregas">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {(reviews ?? []).map((review: any) => {
            const driverName = review.delivery_drivers?.profiles?.full_name || "—";
            return (
              <div key={review.id} className="rounded-2xl bg-card p-4 shadow-card">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 shrink-0">
                      <Star className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{driverName}</p>
                      <div className="flex items-center gap-0.5 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn("h-4 w-4", i < review.rating ? "text-warning fill-warning" : "text-muted")} />
                        ))}
                      </div>
                      {review.comment && <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{format(new Date(review.created_at), "dd/MM/yyyy")}</span>
                </div>
              </div>
            );
          })}
          {(reviews ?? []).length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Star className="h-8 w-8 mb-2" />
              <p className="text-sm">Nenhuma avaliação registrada</p>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
