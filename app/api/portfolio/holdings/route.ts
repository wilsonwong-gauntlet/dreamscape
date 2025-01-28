import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { portfolioId, symbol, assetType, quantity, price, transactionType } = await request.json()

    // Validate input
    if (!portfolioId || !symbol || !assetType || !quantity || !price || !transactionType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify portfolio ownership
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .select('id, customer_id')
      .eq('id', portfolioId)
      .single()

    if (portfolioError || !portfolio) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      )
    }

    if (portfolio.customer_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Start transaction
    const { data: holding, error: holdingError } = await supabase
      .from('holdings')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .eq('symbol', symbol)
      .single()

    if (holdingError && holdingError.code !== 'PGRST116') { // PGRST116 is "not found"
      throw holdingError
    }

    let updatedHolding
    if (transactionType === 'buy') {
      if (holding) {
        // Update existing holding
        const newQuantity = Number(holding.quantity) + Number(quantity)
        const newAveragePrice = ((Number(holding.quantity) * Number(holding.average_price)) + 
          (Number(quantity) * Number(price))) / newQuantity

        const { data, error } = await supabase
          .from('holdings')
          .update({
            quantity: newQuantity,
            average_price: newAveragePrice,
            current_price: price,
            last_price_update: new Date().toISOString()
          })
          .eq('id', holding.id)
          .select()
          .single()

        if (error) throw error
        updatedHolding = data
      } else {
        // Create new holding
        const { data, error } = await supabase
          .from('holdings')
          .insert({
            portfolio_id: portfolioId,
            symbol,
            asset_type: assetType,
            quantity,
            average_price: price,
            current_price: price,
            last_price_update: new Date().toISOString()
          })
          .select()
          .single()

        if (error) throw error
        updatedHolding = data
      }
    } else if (transactionType === 'sell') {
      if (!holding) {
        return NextResponse.json(
          { error: 'No holding found for this asset' },
          { status: 400 }
        )
      }

      const newQuantity = Number(holding.quantity) - Number(quantity)
      if (newQuantity < 0) {
        return NextResponse.json(
          { error: 'Insufficient quantity to sell' },
          { status: 400 }
        )
      }

      if (newQuantity === 0) {
        // Remove holding if quantity becomes 0
        const { error } = await supabase
          .from('holdings')
          .delete()
          .eq('id', holding.id)

        if (error) throw error
        updatedHolding = null
      } else {
        // Update holding quantity
        const { data, error } = await supabase
          .from('holdings')
          .update({
            quantity: newQuantity,
            current_price: price,
            last_price_update: new Date().toISOString()
          })
          .eq('id', holding.id)
          .select()
          .single()

        if (error) throw error
        updatedHolding = data
      }
    }

    // Record transaction
    const { error: transactionError } = await supabase
      .from('portfolio_transactions')
      .insert({
        portfolio_id: portfolioId,
        holding_id: updatedHolding?.id,
        transaction_type: transactionType,
        quantity,
        price,
        total_amount: Number(quantity) * Number(price)
      })

    if (transactionError) throw transactionError

    return NextResponse.json({ success: true, holding: updatedHolding })
  } catch (error) {
    console.error('Error managing holding:', error)
    return NextResponse.json(
      { error: 'Failed to process transaction' },
      { status: 500 }
    )
  }
} 