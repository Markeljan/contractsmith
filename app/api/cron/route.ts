import { type NextRequest, NextResponse } from "next/server"

import { deleteVerification, getVerifications } from "@/lib/actions/db"
import { checkVerifyStatus, verifyContract } from "@/lib/actions/solidity/verify-contract"
import { CRON_SECRET } from "@/lib/data"

const PASS_MESSAGE = "Pass - Verified"
const ALREADY_VERIFIED_MESSAGE = "Smart-contract already verified."

export const GET = async (req: NextRequest) => {
  const token = req.headers.get("Authorization")
  if (!token) {
    return NextResponse.json("Unauthorized", { status: 401 })
  }
  if (token.replace("Bearer ", "") !== CRON_SECRET) {
    return NextResponse.json("Unauthorized", { status: 401 })
  }
  const verifications = await getVerifications()

  for (const verificationData of verifications) {
    try {
      const { result: guid } = await verifyContract(verificationData)

      if (guid === ALREADY_VERIFIED_MESSAGE) {
        console.log(`${verificationData.viemChain.name} ${verificationData.contractAddress}`)
        await deleteVerification(verificationData.deployHash)
        continue
      }
      const verificationStatus = await checkVerifyStatus(guid, verificationData.viemChain)
      if (verificationStatus.result === PASS_MESSAGE) {
        console.log(`${verificationData.viemChain.name} ${verificationData.contractAddress}`)
        await deleteVerification(verificationData.deployHash)
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Unknown error")
    }
  }

  if (verifications.length > 5) console.error(`Too many verifications in queue: ${verifications.length}`)

  return NextResponse.json({ success: true })
}
