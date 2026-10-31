import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { HiOutlineHome, HiOutlineExclamationCircle } from 'react-icons/hi'

interface NotFoundProps {
  returnTo?: string
  returnLabel?: string
}

export const NotFound: React.FC<NotFoundProps> = ({
  returnTo = '/',
  returnLabel = 'Back to Home',
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-6">
      <div className="p-4 rounded-3xl bg-primary-muted text-primary dark:text-primary-light">
        <HiOutlineExclamationCircle className="h-16 w-16" />
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-4xl font-extrabold text-[var(--ui-text)] dark:text-white">
          404 - Page Not Found
        </h1>
        <p className="text-sm text-[var(--ui-text-muted)] dark:text-[var(--ui-text-subtle)]">
          The page you are looking for doesn't exist or has been moved.
        </p>
      </div>

      <Link to={returnTo}>
        <Button icon={<HiOutlineHome className="h-4 w-4" />}>
          {returnLabel}
        </Button>
      </Link>
    </div>
  )
}
