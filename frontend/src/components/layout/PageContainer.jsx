/*
 * Standard page wrapper providing consistent padding and max-width
 * for content within the application shell.
 */
const PageContainer = ({ children, className = '', maxWidth = 'max-w-7xl' }) => {
  return (
    <div className={`mx-auto w-full ${maxWidth} px-5 py-6 ${className}`}>
      {children}
    </div>
  )
}

export default PageContainer
