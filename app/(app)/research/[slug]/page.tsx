import { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import ArticleFeedback from '@/components/research/ArticleFeedback'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertTriangle,
  BarChart3,
  Clock,
  FileText,
  GaugeCircle,
  Globe,
  Info,
  Link as LinkIcon,
  ListChecks,
  Target,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

interface ArticleMetadata {
  investment_type: string[]
  risk_level: 'low' | 'medium' | 'high'
  time_horizon: 'short_term' | 'medium_term' | 'long_term'
  market_conditions: string[]
  key_points: string[]
  methodology: string
  data_sources: string[]
  performance_metrics: Array<{
    metric: string
    value: string
  }>
  disclaimers: string[]
}

interface Article {
  id: string
  title: string
  content: string
  slug: string
  status: string
  created_at: string
  view_count: number
  helpful_count: number
  metadata: ArticleMetadata
  kb_categories: {
    name: string
    slug: string
  } | null
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const slug = (await params).slug
  const supabase = await createClient()

  const { data: article } = await supabase
    .from('kb_articles')
    .select(`
      title,
      content,
      kb_categories (
        name
      )
    `)
    .eq('slug', slug)
    .single()

  if (!article) {
    return {
      title: 'Article Not Found'
    }
  }

  // Optionally access and extend parent metadata
  const previousImages = (await parent).openGraph?.images || []

  return {
    title: article.title,
    description: article.content.substring(0, 160),
    openGraph: {
      title: article.title,
      description: article.content.substring(0, 160),
      type: 'article',
      images: [...previousImages]
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.content.substring(0, 160)
    }
  }
}

export default async function ArticlePage({ params }: Props) {
  const slug = (await params).slug
  const supabase = await createClient()

  const { data: article } = await supabase
    .from('kb_articles')
    .select(`
      *,
      kb_categories (
        name,
        slug
      )
    `)
    .eq('slug', slug)
    .single()

  if (!article) {
    notFound()
  }

  // Increment view count
  await supabase.rpc('increment_article_views', {
    article_id: article.id
  })

  const metadata = article.metadata || {} as ArticleMetadata
  const {
    investment_type = [],
    risk_level = 'medium' as const,
    time_horizon = 'medium_term' as const,
    market_conditions = [],
    key_points = [],
    methodology = '',
    data_sources = [],
    performance_metrics = [],
    disclaimers = []
  } = metadata

  const TIME_HORIZON_LABELS: Record<ArticleMetadata['time_horizon'], string> = {
    short_term: 'Short Term (0-1 year)',
    medium_term: 'Medium Term (1-5 years)',
    long_term: 'Long Term (5+ years)'
  }

  const RISK_LEVEL_LABELS: Record<ArticleMetadata['risk_level'], string> = {
    low: 'Low Risk',
    medium: 'Medium Risk',
    high: 'High Risk'
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        {article.kb_categories && (
          <Link 
            href={`/research/categories/${article.kb_categories.slug}`}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            {article.kb_categories.name}
          </Link>
        )}
        <h1 className="text-3xl font-bold mt-2">{article.title}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-8">
          {/* Key Points */}
          {key_points.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Key Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2">
                  {key_points.map((point: string, index: number) => (
                    <li key={index} className="text-muted-foreground">{point}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Main Content */}
          <Card>
            <CardContent className="pt-6">
              <div className="prose prose-slate max-w-none">
                {article.content}
              </div>
            </CardContent>
          </Card>

          {/* Methodology */}
          {methodology && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Methodology
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-slate max-w-none">
                  {methodology}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Metrics */}
          {performance_metrics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {performance_metrics.map((metric: { metric: string; value: string }, index: number) => (
                    <div key={index} className="flex justify-between items-center p-4 rounded-lg border">
                      <span className="text-muted-foreground">{metric.metric}</span>
                      <span className="font-semibold">{metric.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Disclaimers */}
          {disclaimers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Disclaimers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {disclaimers.map((disclaimer: string, index: number) => (
                    <p key={index} className="text-sm text-muted-foreground">
                      {disclaimer}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Investment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Investment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Investment Types */}
              {investment_type.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Target className="h-4 w-4" />
                    Investment Types
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {investment_type.map((type: string) => (
                      <Badge key={type} variant="secondary">
                        {type.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Level */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <GaugeCircle className="h-4 w-4" />
                  Risk Level
                </div>
                <Badge variant="outline" className="capitalize">
                  {RISK_LEVEL_LABELS[risk_level as keyof typeof RISK_LEVEL_LABELS]}
                </Badge>
              </div>

              {/* Time Horizon */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Time Horizon
                </div>
                <Badge variant="outline">
                  {TIME_HORIZON_LABELS[time_horizon as keyof typeof TIME_HORIZON_LABELS]}
                </Badge>
              </div>

              {/* Market Conditions */}
              {market_conditions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    Market Conditions
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {market_conditions.map((condition: string) => (
                      <Badge key={condition} variant="secondary">
                        {condition.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Sources */}
          {data_sources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Data Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data_sources.map((source: string, index: number) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {source}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Article Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Article Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Views</span>
                  <span>{article.view_count}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Found Helpful</span>
                  <span>{article.helpful_count}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Published</span>
                  <span>{new Date(article.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feedback */}
          <Card>
            <CardHeader>
              <CardTitle>Was this helpful?</CardTitle>
            </CardHeader>
            <CardContent>
              <ArticleFeedback articleId={article.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 