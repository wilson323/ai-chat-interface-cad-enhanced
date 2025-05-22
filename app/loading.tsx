export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#6cb33f] border-t-transparent"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-300">加载中...</p>
      </div>
    </div>
  )
}
