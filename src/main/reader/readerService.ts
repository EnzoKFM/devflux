import type Database from 'better-sqlite3'
import type { ArticleContent } from '@shared/contract'
import { countWordsInHtml, toReadingWordCount } from '../collector/wordCount'
import { recordArticleWordCount, requireArticle } from '../repositories/articleRepository'
import { extractArticleContent, type PageFetcher } from './articleExtractor'

export async function loadArticleContent(
  database: Database.Database,
  articleId: number,
  fetchPage?: PageFetcher
): Promise<ArticleContent> {
  const article = requireArticle(database, articleId)
  const articleContent = await extractArticleContent(
    { articleId: article.id, title: article.title, url: article.url },
    fetchPage
  )
  const readingWordCount = articleContent.contentHtml === null ? null : toReadingWordCount(countWordsInHtml(articleContent.contentHtml))
  if (readingWordCount !== null) {
    recordArticleWordCount(database, article.id, readingWordCount)
  }
  return articleContent
}
