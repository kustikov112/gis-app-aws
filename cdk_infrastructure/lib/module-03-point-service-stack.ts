import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "node:path";

export class Module03PointServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pointsTable = new dynamodb.Table(this, "PointsTable", {
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const getPointsListLambda = new nodejs.NodejsFunction(this, "GetPointsListLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../lambda/getPointsList.ts"),
      environment: {
        POINTS_TABLE_NAME: pointsTable.tableName,
      },
      bundling: {
        target: "node20",
        format: nodejs.OutputFormat.ESM,
      },
    });

    const getPointByIdLambda = new nodejs.NodejsFunction(this, "GetPointByIdLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../lambda/getPointById.ts"),
      environment: {
        POINTS_TABLE_NAME: pointsTable.tableName,
      },
      bundling: {
        target: "node20",
        format: nodejs.OutputFormat.ESM,
      },
    });

    const createPointLambda = new nodejs.NodejsFunction(this, "CreatePointLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../lambda/createPoint.ts"),
      environment: {
        POINTS_TABLE_NAME: pointsTable.tableName,
      },
      bundling: {
        target: "node20",
        format: nodejs.OutputFormat.ESM,
      },
    });

    pointsTable.grantReadData(getPointsListLambda);
    pointsTable.grantReadData(getPointByIdLambda);
    pointsTable.grantReadWriteData(createPointLambda);

    const pointsApi = new apigateway.RestApi(this, "PointsApi", {
      restApiName: "MapPointsPointService",
      deployOptions: {
        stageName: "prod",
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ["GET", "POST", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    const pointsResource = pointsApi.root.addResource("points");
    pointsResource.addMethod("GET", new apigateway.LambdaIntegration(getPointsListLambda));
    pointsResource.addMethod("POST", new apigateway.LambdaIntegration(createPointLambda));

    const pointByIdResource = pointsResource.addResource("{pointId}");
    pointByIdResource.addMethod("GET", new apigateway.LambdaIntegration(getPointByIdLambda));

    new cdk.CfnOutput(this, "PointsApiBaseUrl", {
      value: pointsApi.url.replace(/\/$/, ""),
      description: "Base URL for points API",
    });

    new cdk.CfnOutput(this, "PointsTableName", {
      value: pointsTable.tableName,
      description: "DynamoDB table used by point service",
    });
  }
}