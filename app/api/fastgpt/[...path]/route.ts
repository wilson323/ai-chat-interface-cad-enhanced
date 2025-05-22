import { type NextRequest, NextResponse } from "next/server"

const FASTGPT_API_URL = process.env.FASTGPT_API_URL || "https://zktecoaihub.com/api"
const FASTGPT_API_KEY = process.env.FASTGPT_API_KEY || ""

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const path = params.path.join("/")
    const url = new URL(request.url)
    const queryString = url.search

    const response = await fetch(`${FASTGPT_API_URL}/${path}${queryString}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FASTGPT_API_KEY}`,
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Error in FastGPT API:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const path = params.path.join("/")
    const body = await request.json()

    const response = await fetch(`${FASTGPT_API_URL}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FASTGPT_API_KEY}`,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Error in FastGPT API:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const path = params.path.join("/")
    const url = new URL(request.url)
    const queryString = url.search

    const response = await fetch(`${FASTGPT_API_URL}/${path}${queryString}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FASTGPT_API_KEY}`,
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Error in FastGPT API:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
