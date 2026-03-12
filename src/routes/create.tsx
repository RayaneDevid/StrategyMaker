import AuthGuard from '@/components/auth/AuthGuard'
import CreateSessionForm from '@/components/create/CreateSessionForm'

export default function CreatePage() {
  return (
    <AuthGuard>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <CreateSessionForm />
      </div>
    </AuthGuard>
  )
}
