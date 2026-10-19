export interface TopicDefinition {
  id: string
  label: string
  embeddingText: string
}

export const TOPIC_CATALOG: readonly TopicDefinition[] = [
  {
    id: 'frontend-frameworks',
    label: 'Frameworks front-end',
    embeddingText:
      'Frontend JavaScript frameworks and libraries: React, Vue, Angular, Svelte, Solid, Next.js, Nuxt, components, state management, rendering'
  },
  {
    id: 'css-design',
    label: 'CSS et design d’interface',
    embeddingText:
      'CSS and web design: layout, flexbox, grid, container queries, animations, Tailwind, design systems, responsive design, typography'
  },
  {
    id: 'accessibility',
    label: 'Accessibilité',
    embeddingText:
      'Web accessibility: WCAG, ARIA, screen readers, keyboard navigation, semantic HTML, inclusive design, color contrast'
  },
  {
    id: 'web-performance',
    label: 'Performance web',
    embeddingText:
      'Web performance: Core Web Vitals, loading speed, bundle size, caching, lazy loading, rendering optimization, Lighthouse, profiling'
  },
  {
    id: 'javascript-runtimes',
    label: 'Node.js, Deno et Bun',
    embeddingText:
      'JavaScript runtimes and server-side JavaScript: Node.js, Deno, Bun, npm, package managers, ECMAScript, backend APIs, Express, Fastify'
  },
  {
    id: 'typescript',
    label: 'TypeScript',
    embeddingText:
      'TypeScript: static typing, type system, generics, type inference, compiler, tsconfig, type-safe code, migration from JavaScript'
  },
  {
    id: 'rust',
    label: 'Rust',
    embeddingText:
      'Rust programming language: ownership, borrow checker, cargo, crates, memory safety, systems programming, async Rust, WebAssembly'
  },
  {
    id: 'go',
    label: 'Go',
    embeddingText:
      'Go programming language: Golang, goroutines, channels, concurrency, standard library, modules, microservices, command line tools'
  },
  {
    id: 'python',
    label: 'Python',
    embeddingText:
      'Python programming language: Django, Flask, FastAPI, pip, typing, asyncio, data scripts, packaging, virtual environments'
  },
  {
    id: 'jvm',
    label: 'Java et Kotlin',
    embeddingText:
      'Java and Kotlin on the JVM: Spring Boot, Jakarta EE, Gradle, Maven, coroutines, JVM performance, garbage collection, Android backend'
  },
  {
    id: 'dotnet',
    label: '.NET et C#',
    embeddingText:
      '.NET platform and C# language: ASP.NET Core, Entity Framework, Blazor, NuGet, LINQ, Visual Studio, minimal APIs'
  },
  {
    id: 'php',
    label: 'PHP',
    embeddingText: 'PHP language and ecosystem: Laravel, Symfony, Composer, WordPress, PHP 8 features, web backends'
  },
  {
    id: 'databases',
    label: 'Bases de données',
    embeddingText:
      'Databases and SQL: PostgreSQL, MySQL, SQLite, indexes, query optimization, migrations, transactions, NoSQL, Redis, MongoDB'
  },
  {
    id: 'devops-containers',
    label: 'DevOps et conteneurs',
    embeddingText:
      'DevOps and containers: Docker, Kubernetes, CI/CD pipelines, GitHub Actions, infrastructure as code, Terraform, deployment, monitoring'
  },
  {
    id: 'cloud',
    label: 'Cloud',
    embeddingText:
      'Cloud computing: AWS, Azure, Google Cloud, serverless, edge functions, managed services, cloud architecture, costs, Cloudflare'
  },
  {
    id: 'security',
    label: 'Sécurité',
    embeddingText:
      'Application and software security: vulnerabilities, CVE, authentication, OAuth, encryption, supply chain attacks, XSS, injection, penetration testing'
  },
  {
    id: 'ai-for-developers',
    label: 'IA pour développeurs',
    embeddingText:
      'Artificial intelligence for developers: large language models, coding assistants, Copilot, prompts, agents, machine learning APIs, AI-assisted programming'
  },
  {
    id: 'mobile',
    label: 'Développement mobile',
    embeddingText:
      'Mobile development: iOS, Android, Swift, Kotlin, Flutter, React Native, mobile apps, app stores, cross-platform'
  },
  {
    id: 'architecture',
    label: 'Architecture logicielle',
    embeddingText:
      'Software architecture and design: microservices, domain-driven design, design patterns, clean architecture, event-driven systems, scalability, APIs'
  },
  {
    id: 'testing',
    label: 'Tests et qualité',
    embeddingText:
      'Software testing and quality: unit tests, integration tests, end-to-end testing, Playwright, Vitest, Jest, test-driven development, code review'
  },
  {
    id: 'developer-tools',
    label: 'Outils et éditeurs',
    embeddingText:
      'Developer tools and editors: VS Code, Vim, JetBrains IDEs, terminal, shell, Git, linters, bundlers, productivity, command line utilities'
  },
  {
    id: 'open-source',
    label: 'Open source',
    embeddingText:
      'Open source software: maintainers, licenses, community, contributions, funding, project governance, releases, forks'
  },
  {
    id: 'career',
    label: 'Carrière et métier',
    embeddingText:
      'Software engineering career: hiring, interviews, management, remote work, soft skills, team practices, productivity, learning, salaries'
  },
  {
    id: 'webassembly-systems',
    label: 'WebAssembly et systèmes',
    embeddingText:
      'WebAssembly and low-level systems: C, C++, compilers, operating systems, Linux kernel, memory management, performance engineering'
  },
  {
    id: 'web-platform',
    label: 'Plateforme web et navigateurs',
    embeddingText:
      'Web platform and browsers: web standards, HTML, browser APIs, Chrome, Firefox, Safari, W3C, progressive web apps, new browser features'
  }
]

const TOPIC_BY_ID = new Map(TOPIC_CATALOG.map((topic) => [topic.id, topic]))

export function findTopicById(topicId: string): TopicDefinition | null {
  return TOPIC_BY_ID.get(topicId) ?? null
}

export function isTopicId(value: unknown): value is string {
  return typeof value === 'string' && TOPIC_BY_ID.has(value)
}
