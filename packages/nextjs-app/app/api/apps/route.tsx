import { getAppList } from "@/lib/repository";
import { NextResponse } from "next/server";

/**
 * 获取应用列表
 */
export async function GET() {
	const result = await getAppList();
	return NextResponse.json(result);
}
