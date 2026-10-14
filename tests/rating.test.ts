import { describe, expect, it } from "vitest"
import { computeRatingAggregate, REVIEW_WINDOW_DAYS } from "@/lib/rating"

describe("computeRatingAggregate", () => {
  it("mengembalikan nol saat belum ada ulasan", () => {
    expect(computeRatingAggregate([])).toEqual({
      totalReviews: 0,
      ratingAvg: 0,
    })
  })

  it("menghitung rata-rata satu ulasan", () => {
    expect(computeRatingAggregate([{ rating: 4 }])).toEqual({
      totalReviews: 1,
      ratingAvg: 4,
    })
  })

  it("menghitung rata-rata beberapa ulasan", () => {
    const agg = computeRatingAggregate([
      { rating: 5 },
      { rating: 4 },
      { rating: 3 },
    ])
    expect(agg.totalReviews).toBe(3)
    expect(agg.ratingAvg).toBe(4)
  })

  it("tidak membulatkan hasil pecahan (pembulatan urusan tampilan)", () => {
    const agg = computeRatingAggregate([{ rating: 5 }, { rating: 4 }])
    expect(agg.ratingAvg).toBeCloseTo(4.5, 5)
  })

  it("menjaga rata-rata dalam rentang 1–5", () => {
    const agg = computeRatingAggregate([
      { rating: 1 },
      { rating: 1 },
      { rating: 5 },
    ])
    expect(agg.ratingAvg).toBeGreaterThanOrEqual(1)
    expect(agg.ratingAvg).toBeLessThanOrEqual(5)
  })

  it("jendela ulasan bernilai positif dan masuk akal", () => {
    expect(REVIEW_WINDOW_DAYS).toBeGreaterThan(0)
    expect(REVIEW_WINDOW_DAYS).toBeLessThanOrEqual(365)
  })
})
