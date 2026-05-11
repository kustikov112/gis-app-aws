import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "node:path";

export class Module03PointServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getPointsListLambda = new nodejs.NodejsFunction(this, "GetPointsListLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../lambda/getPointsList.ts"),
      bundling: {
        target: "node20",
        format: nodejs.OutputFormat.ESM,
      },
    });

    const getPointByIdLambda = new nodejs.NodejsFunction(this, "GetPointByIdLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../lambda/getPointById.ts"),
      bundling: {
        target: "node20",
        format: nodejs.OutputFormat.ESM,
      },
    });

    const pointsApi = new apigateway.RestApi(this, "PointsApi", {
      restApiName: "MapPointsPointService",
      deployOptions: {
        stageName: "prod",
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ["GET", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    const pointsResource = pointsApi.root.addResource("points");
    pointsResource.addMethod("GET", new apigateway.LambdaIntegration(getPointsListLambda));

    const pointByIdResource = pointsResource.addResource("{pointId}");
    pointByIdResource.addMethod("GET", new apigateway.LambdaIntegration(getPointByIdLambda));

    new cdk.CfnOutput(this, "PointsApiBaseUrl", {
      value: pointsApi.url.replace(/\/$/, ""),
      description: "Base URL for points API",
    });
  }
}