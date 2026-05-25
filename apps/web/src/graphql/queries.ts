import { gql } from "graphql-request";

export const DASHBOARD_QUERY = gql`
  query Dashboard($months: Int, $weeks: Int, $highCostLimit: Int) {
    spendSummary {
      tripCount
      totalSpend
      totalSavings
      avgBasket
      avgWeeklySpend
    }
    monthlySpend(months: $months) {
      month
      spent
      saved
    }
    weeklyTrend(weeks: $weeks) {
      weekStart
      spent
      saved
    }
    dowDealPatterns {
      lookbackDays
      minLineItems
      recommendedDayName
      recommendedDealScore
      patterns {
        dayOfWeek
        dayName
        tripCount
        lineItemCount
        avgUnitPrice
        avgDiscountPct
        priceVsOverallPct
        discountVsOverallPct
        dealScore
      }
    }
    stapleCategoryInsights {
      stapleLookbackDays
      priceLookbackDays
      activeWeeks
      thresholdPct
      items {
        categoryId
        label
        productCount
        weekAppearances
        activeWeeks
        weekFrequencyPct
        priceTrendDirection
        priceChangePct
        bestDayName
        bestDayDealScore
        sampleProductNames
        priceUnit
        priceTrend {
          period
          avgPrice
        }
      }
      nearStapleItems {
        categoryId
        label
        productCount
        weekAppearances
        activeWeeks
        weekFrequencyPct
        thresholdPct
        gapToThresholdPct
        sampleProductNames
      }
    }
    meatCategoryInsights {
      priceLookbackDays
      priceUnit
      items {
        categoryId
        label
        productCount
        priceTrendDirection
        priceChangePct
        bestDayName
        bestDayDealScore
        sampleProductNames
        priceUnit
        priceTrend {
          period
          avgPrice
        }
      }
    }
    categoryBreakdown {
      department
      amount
    }
    staples {
      lookbackDays
      frequencyBasis
      windowTripCount
      activeWeeks
      tripCount
      mode
      message
      items {
        id
        name
        department
        tripAppearances
        weekAppearances
        windowTrips
        activeWeeks
        frequencyPct
        isStaple
      }
    }
    highCostProducts(limit: $highCostLimit) {
      byUnitPrice {
        productId
        name
        department
        unitPrice
        cumulativeSpend
        purchaseCount
      }
      byCumulativeSpend {
        productId
        name
        department
        unitPrice
        cumulativeSpend
        purchaseCount
      }
    }
    discountCapture {
      department
      totalItems
      totalSaved
      avgDiscountPct
    }
  }
`;

export const PRICE_TREND_QUERY = gql`
  query PriceTrend($productId: ID!) {
    priceTrend(productId: $productId) {
      productId
      productName
      avgPrice
      bestPrice
      worstPrice
      volatility
      observationCount
      points {
        observedAt
        observedPrice
        regularPrice
        receiptId
      }
    }
  }
`;
