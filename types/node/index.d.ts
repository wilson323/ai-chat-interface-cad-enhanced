// 自定义Node类型声明，用于解决缺少NodeJS.Timeout类型的问题
declare namespace NodeJS {
  interface Timeout {}
  interface Global {}
} 