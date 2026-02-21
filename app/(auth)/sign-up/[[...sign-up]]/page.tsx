import { SignUp } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
          <div className="w-full max-w-md p-8 bg-white rounded shadow">
            <SignUp />
          </div>
        </div>
  )
}