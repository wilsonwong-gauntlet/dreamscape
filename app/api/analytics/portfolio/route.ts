import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Get user role
  const { data: agent } = await supabase
    .from('agents')
    .select('role')
    .eq('id', user.id)
    .single()

  try {
    let portfolioQuery = supabase
      .from('portfolios')
      .select(`
        id,
        holdings (
          id,
          symbol,
          asset_type,
          quantity,
          average_price,
          current_price
        )
      `)

    // If user is not an agent, only show their portfolio
    if (!agent) {
      portfolioQuery = portfolioQuery.eq('customer_id', user.id)
    }

    const { data: portfolios, error: portfoliosError } = await portfolioQuery

    if (portfoliosError) {
      console.error('Error fetching portfolios:', portfoliosError)
      return NextResponse.json(
        { error: 'Failed to fetch portfolio data' },
        { status: 500 }
      )
    }

    // Calculate metrics
    const metrics = calculatePortfolioMetrics(portfolios)

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error in portfolio analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculatePortfolioMetrics(portfolios: any[]) {
  let totalValue = 0
  let totalCost = 0
  let cashBalance = 0

  // Calculate total portfolio value and cost basis
  portfolios.forEach(portfolio => {
    portfolio.holdings.forEach((holding: any) => {
      if (holding.asset_type === 'cash') {
        cashBalance += Number(holding.quantity)
      } else {
        const currentValue = Number(holding.quantity) * Number(holding.current_price || holding.average_price)
        const costBasis = Number(holding.quantity) * Number(holding.average_price)
        totalValue += currentValue
        totalCost += costBasis
      }
    })
  })

  // Calculate returns
  const totalAUM = totalValue + cashBalance
  const portfolioReturn = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0
  
  // Mock YTD performance for now - this should be calculated from historical data
  const ytdPerformance = 12.5

  // Calculate asset allocation
  const assetAllocation = calculateAssetAllocation(portfolios)

  // Mock performance metrics - these should be calculated from historical data
  const performance = {
    oneMonth: 2.1,
    threeMonths: 5.8,
    sixMonths: 8.9,
    ytd: ytdPerformance,
    oneYear: 15.2,
    threeYears: 45.7,
    fiveYears: 76.3
  }

  return {
    totalAUM,
    portfolioReturn,
    ytdPerformance,
    cashBalance,
    assetAllocation,
    performance
  }
}

function calculateAssetAllocation(portfolios: any[]) {
  const allocation = {
    equities: 0,
    fixedIncome: 0,
    alternatives: 0,
    cash: 0
  }

  let total = 0

  portfolios.forEach(portfolio => {
    portfolio.holdings.forEach((holding: any) => {
      const value = Number(holding.quantity) * Number(holding.current_price || holding.average_price)
      total += value

      switch (holding.asset_type) {
        case 'stock':
        case 'etf':
          allocation.equities += value
          break
        case 'bond':
          allocation.fixedIncome += value
          break
        case 'crypto':
          allocation.alternatives += value
          break
        case 'cash':
          allocation.cash += value
          break
      }
    })
  })

  // Convert to percentages
  if (total > 0) {
    allocation.equities = (allocation.equities / total) * 100
    allocation.fixedIncome = (allocation.fixedIncome / total) * 100
    allocation.alternatives = (allocation.alternatives / total) * 100
    allocation.cash = (allocation.cash / total) * 100
  }

  return allocation
} 