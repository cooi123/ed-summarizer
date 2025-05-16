// import { LoginForm } from "@/components/login-form"
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import { LoginForm } from "@/components/login-form"
import { redirect } from "next/navigation"
import { currentUser } from '@clerk/nextjs/server'

export default async function Home() {
  const user = await currentUser();
  
  if (user) {
    redirect("/signup");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/40">
      <div className="w-full max-w-md">
        <SignedOut>
          <LoginForm />
        </SignedOut>
      </div>
    </main>
  )
}
