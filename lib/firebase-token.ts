import { createRemoteJWKSet, jwtVerify } from "jose";


const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const jwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export type FirebaseClaims = {
  uid: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
};

export async function verifyFirebaseToken(idToken: string): Promise<FirebaseClaims> {
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ["RS256"],
  });
  if (!payload.sub) throw new Error("Token has no subject");
  return {
    uid: payload.sub,
    email: typeof payload.email === "string" ? payload.email.toLowerCase() : undefined,
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === "string" ? payload.name : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
  };
}