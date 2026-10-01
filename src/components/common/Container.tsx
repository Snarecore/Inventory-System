import React from 'react'
import { cn } from '@/utils/cn'

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType
}

export const Container: React.FC<ContainerProps> = ({
  as: Component = 'div',
  className,
  children,
  ...props
}) => {
  return (
    <Component
      className={cn(
        'max-w-screen-sm sm:max-w-screen-sm md:max-w-screen-md lg:max-w-screen-lg xl:max-w-screen-xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
}
