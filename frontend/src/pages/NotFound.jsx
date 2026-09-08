import PageContainer from '../components/layout/PageContainer.jsx'
import Card from '../components/ui/Card.jsx'

const NotFound = () => {
  return (
    <PageContainer>
      <Card>
        <div className="py-16 text-center">
          <p className="text-sm font-semibold text-slate-100">Page not found</p>
          <p className="mt-1 text-sm text-slate-400">
            The requested page does not exist.
          </p>
        </div>
      </Card>
    </PageContainer>
  )
}

export default NotFound
