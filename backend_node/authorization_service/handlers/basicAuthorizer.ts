type AuthorizerEvent = {
  authorizationToken?: string;
  methodArn?: string;
};

type PolicyEffect = "Allow" | "Deny";

const buildPolicy = (principalId: string, effect: PolicyEffect, resource: string) => ({
  principalId,
  policyDocument: {
    Version: "2012-10-17",
    Statement: [
      {
        Action: "execute-api:Invoke",
        Effect: effect,
        Resource: resource,
      },
    ],
  },
});

export const handler = async (event: AuthorizerEvent) => {
  const token = event.authorizationToken;
  const resource = event.methodArn ?? "*";

  if (!token) {
    throw new Error("Unauthorized");
  }

  if (!token.startsWith("Basic ")) {
    return buildPolicy("anonymous", "Deny", resource);
  }

  const encoded = token.slice("Basic ".length).trim();
  let decoded = "";

  try {
    decoded = Buffer.from(encoded, "base64").toString("utf-8");
  } catch {
    return buildPolicy("anonymous", "Deny", resource);
  }

  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex <= 0) {
    return buildPolicy("anonymous", "Deny", resource);
  }

  const username = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  if (!username || process.env[username] !== password) {
    return buildPolicy(username || "anonymous", "Deny", resource);
  }

  return buildPolicy(username, "Allow", resource);
};
