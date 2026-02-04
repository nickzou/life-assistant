interface PageContainerProps {
  children: React.ReactNode
}

export function PageContainer({ children }: PageContainerProps) {
  return <div className="max-w-4xl mx-auto">{children}</div>
}
