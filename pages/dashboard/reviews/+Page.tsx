import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#root/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#root/components/ui/table";
import { Button } from "#root/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#root/components/ui/alert-dialog";
import { Star, Trash2, Loader2, Check, Ban } from "lucide-react";
import { trpc } from "#root/shared/trpc/client";
import { toast } from "sonner";

interface Review {
  id: string;
  productId: string;
  productName: string;
  userId: string | null;
  userName: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  mediaUrl: string | null;
  createdAt: Date | string;
}

type ReviewStatus = "pending" | "approved" | "rejected";

/** Tab order puts pending first — that is the queue an admin comes here for. */
const STATUS_FILTERS: { value: ReviewStatus | "all"; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const STATUS_STYLES: Record<ReviewStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-rose-100 text-rose-800 border-rose-200",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "all">(
    "pending",
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await trpc.product.getAllReviews.query({
        limit: 100,
        ...(statusFilter === "all" ? {} : { status: statusFilter }),
      });
      if (result.success) {
        setReviews(result.result.reviews as Review[]);
      }
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
      toast.error("Failed to load reviews");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  /**
   * Moderate one review. The row is removed from view when it no longer
   * matches the active filter, so approving from the Pending queue clears it
   * without a refetch.
   */
  const handleStatus = async (reviewId: string, status: ReviewStatus) => {
    setSavingId(reviewId);
    try {
      const result = await trpc.product.updateReviewStatus.mutate({
        reviewId,
        status,
      });
      if (result.success) {
        toast.success(
          status === "approved" ? "Review approved" : "Review rejected",
        );
        setReviews((prev) =>
          statusFilter === "all"
            ? prev.map((r) => (r.id === reviewId ? { ...r, status } : r))
            : prev.filter((r) => r.id !== reviewId),
        );
      } else {
        toast.error("Failed to update review");
      }
    } catch (err) {
      console.error("Failed to update review:", err);
      toast.error("Failed to update review");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const result = await trpc.product.deleteReview.mutate({ reviewId: deleteId });
      if (result.success) {
        toast.success("Review deleted");
        setReviews((prev) => prev.filter((r) => r.id !== deleteId));
      } else {
        toast.error("Failed to delete review");
      }
    } catch (err) {
      console.error("Failed to delete review:", err);
      toast.error("Failed to delete review");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="p-6 w-full h-full mx-auto">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-2xl font-bold">Reviews</h1>
        <p className="text-slate-500">
          Manage customer reviews across all products
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {STATUS_FILTERS.find((f) => f.value === statusFilter)?.label}{" "}
            Reviews ({reviews.length})
          </CardTitle>
          <CardDescription>
            Only <strong>approved</strong> reviews appear on the storefront.
            New customer submissions arrive as <strong>pending</strong>.
            Rejecting hides a review without deleting it, so the decision can
            be reversed; Delete removes it permanently.
          </CardDescription>
          <div className='flex flex-wrap gap-2 pt-3'>
            {STATUS_FILTERS.map((f) => (
              <Button
                key={f.value}
                size='sm'
                variant={statusFilter === f.value ? "primary" : "outline"}
                onClick={() => setStatusFilter(f.value)}>
                {f.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No reviews yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="min-w-[200px]">Comment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium max-w-[150px] truncate">
                      {review.productName}
                    </TableCell>
                    <TableCell>{review.userName}</TableCell>
                    <TableCell>
                      <StarRating rating={review.rating} />
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="line-clamp-2 text-sm text-slate-600">
                        {review.comment}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[review.status]}`}
                      >
                        {review.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                      {formatDate(review.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {review.status !== "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={savingId === review.id}
                            onClick={() => handleStatus(review.id, "approved")}
                            title="Approve — publish on the storefront"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        {review.status !== "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={savingId === review.id}
                            onClick={() => handleStatus(review.id, "rejected")}
                            title="Reject — hide without deleting"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteId(review.id)}
                          title="Delete permanently"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
