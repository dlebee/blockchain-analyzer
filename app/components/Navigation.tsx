'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(path)
  }

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">Blockchain Analyzer</span>
            </Link>
          </div>
          <div className="flex items-center space-x-1">
            <Link
              href="/"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/') && !pathname.startsWith('/chain')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Chains
            </Link>
            <Link
              href="/tokens"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/tokens') && !pathname.startsWith('/token-ranks')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Tokens
            </Link>
            <Link
              href="/token-ranks"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/token-ranks')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Rankings
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

