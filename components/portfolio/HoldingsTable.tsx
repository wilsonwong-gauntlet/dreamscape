'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'

interface Holding {
  id: string
  symbol: string
  asset_type: 'stock' | 'bond' | 'etf' | 'mutual_fund' | 'crypto' | 'cash'
  quantity: number
  average_price: number
  current_price: number
}

interface HoldingsTableProps {
  portfolioId: string
  holdings: Holding[]
}

export function HoldingsTable({ portfolioId, holdings }: HoldingsTableProps) {
  const [isTradeDialogOpen, setIsTradeDialogOpen] = useState(false)
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null)
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [symbol, setSymbol] = useState('')
  const [assetType, setAssetType] = useState<Holding['asset_type']>('stock')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleTrade = async () => {
    if (!quantity || !price || (!selectedHolding && !symbol)) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/portfolio/holdings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          portfolioId,
          symbol: selectedHolding?.symbol || symbol,
          assetType: selectedHolding?.asset_type || assetType,
          quantity: Number(quantity),
          price: Number(price),
          transactionType: tradeType,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to process trade')
      }

      toast({
        title: 'Trade Successful',
        description: `Successfully ${tradeType === 'buy' ? 'bought' : 'sold'} ${quantity} ${selectedHolding?.symbol || symbol}`,
      })

      setIsTradeDialogOpen(false)
      // Refresh the page to show updated holdings
      window.location.reload()
    } catch (error) {
      toast({
        title: 'Trade Failed',
        description: error instanceof Error ? error.message : 'Failed to process trade',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedHolding(null)
    setQuantity('')
    setPrice('')
    setSymbol('')
    setAssetType('stock')
    setTradeType('buy')
  }

  const handleTradeClick = (holding?: Holding) => {
    resetForm()
    if (holding) {
      setSelectedHolding(holding)
      setPrice(holding.current_price.toString())
    }
    setIsTradeDialogOpen(true)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Holdings</h2>
        <Button onClick={() => handleTradeClick()}>New Trade</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Avg Price</TableHead>
            <TableHead className="text-right">Current Price</TableHead>
            <TableHead className="text-right">Market Value</TableHead>
            <TableHead className="text-right">Gain/Loss</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((holding) => {
            const marketValue = holding.quantity * holding.current_price
            const costBasis = holding.quantity * holding.average_price
            const gainLoss = marketValue - costBasis
            const gainLossPercent = (gainLoss / costBasis) * 100

            return (
              <TableRow key={holding.id}>
                <TableCell>{holding.symbol}</TableCell>
                <TableCell>{holding.asset_type}</TableCell>
                <TableCell className="text-right">{holding.quantity.toLocaleString()}</TableCell>
                <TableCell className="text-right">${holding.average_price.toLocaleString()}</TableCell>
                <TableCell className="text-right">${holding.current_price.toLocaleString()}</TableCell>
                <TableCell className="text-right">${marketValue.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <span className={gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ${Math.abs(gainLoss).toLocaleString()} ({gainLossPercent.toFixed(2)}%)
                  </span>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => handleTradeClick(holding)}>
                    Trade
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <Dialog open={isTradeDialogOpen} onOpenChange={setIsTradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedHolding ? 'Trade Asset' : 'New Trade'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedHolding && (
              <>
                <div>
                  <label className="text-sm font-medium">Symbol</label>
                  <Input
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="Enter symbol"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Asset Type</label>
                  <Select value={assetType} onValueChange={(value: any) => setAssetType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock">Stock</SelectItem>
                      <SelectItem value="bond">Bond</SelectItem>
                      <SelectItem value="etf">ETF</SelectItem>
                      <SelectItem value="mutual_fund">Mutual Fund</SelectItem>
                      <SelectItem value="crypto">Crypto</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div>
              <label className="text-sm font-medium">Trade Type</label>
              <Select value={tradeType} onValueChange={(value: any) => setTradeType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Quantity</label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Price</label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Enter price"
              />
            </div>
            <Button onClick={handleTrade} disabled={isLoading} className="w-full">
              {isLoading ? 'Processing...' : 'Submit Trade'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 