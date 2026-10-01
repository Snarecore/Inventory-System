import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { HiOutlineHome, HiOutlineExclamationCircle } from 'react-icons/hi'

export const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-6">
      <div className="p-4 rounded-3xl bg-primary-muted text-primary dark:text-primary-light">
        <HiOutlineExclamationCircle className="h-16 w-16" />
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">
          404 - Page Not Found
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          The page you are looking for doesn't exist or has been moved.
        </p>
      </div>

      <Link to="/">
        <Button icon={<HiOutlineHome className="h-4 w-4" />}>
          Back to Home
        </Button>
      </Link>
    </div>
  )
}
