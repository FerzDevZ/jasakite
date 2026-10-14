// Agregasi rating jasa — satu sumber kebenaran agar konsisten
// dipakai di POST /api/reviews dan PATCH /api/orders/[id]
export function computeRatingAggregate(reviews: { rating: number }[]) {
  const totalReviews = reviews.length
  const ratingAvg =
    totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0

  return { totalReviews, ratingAvg }
}

export const REVIEW_WINDOW_DAYS = 60
