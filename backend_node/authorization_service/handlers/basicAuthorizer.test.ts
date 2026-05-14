import test from "node:test";
import assert from "node:assert/strict";
import { handler } from "./basicAuthorizer";

test("basicAuthorizer: missing token => 401", async () => {
  await assert.rejects(() => handler({}), /Unauthorized/);
});

test("basicAuthorizer: invalid token => deny policy", async () => {
  const token = Buffer.from("user:wrong", "utf-8").toString("base64");
  process.env.user = "TEST_PASSWORD";
  const result = await handler({
    authorizationToken: `Basic ${token}`,
    methodArn: "arn:aws:execute-api:region:account:api/stage/GET/import",
  });

  const policy = result as {
    policyDocument: { Statement: Array<{ Effect: string; Resource: string }> };
    principalId: string;
  };

  assert.equal(policy.principalId, "user");
  assert.equal(policy.policyDocument.Statement[0].Effect, "Deny");
});

test("basicAuthorizer: valid token => allow policy", async () => {
  const token = Buffer.from("user:TEST_PASSWORD", "utf-8").toString("base64");
  process.env.user = "TEST_PASSWORD";
  const result = await handler({
    authorizationToken: `Basic ${token}`,
    methodArn: "arn:aws:execute-api:region:account:api/stage/GET/import",
  });

  const policy = result as {
    policyDocument: { Statement: Array<{ Effect: string; Resource: string }> };
    principalId: string;
  };

  assert.equal(policy.principalId, "user");
  assert.equal(policy.policyDocument.Statement[0].Effect, "Allow");
});
