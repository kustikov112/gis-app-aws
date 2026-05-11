import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
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

    const importBucket = new s3.Bucket(this, "ImportBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      autoDeleteObjects: true,
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

    const getUploadUrlLambda = new nodejs.NodejsFunction(this, "GetUploadUrlLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../lambda/getUploadUrl.ts"),
      environment: {
        IMPORT_BUCKET_NAME: importBucket.bucketName,
      },
      bundling: {
        target: "node20",
        format: nodejs.OutputFormat.ESM,
      },
    });

    const processUploadedPhotoLambda = new nodejs.NodejsFunction(this, "ProcessUploadedPhotoLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../lambda/processUploadedPhoto.ts"),
      environment: {
        POINTS_TABLE_NAME: pointsTable.tableName,
      },
      bundling: {
        target: "node20",
        format: nodejs.OutputFormat.ESM,
      },
    });

    const importPointsFileLambda = new nodejs.NodejsFunction(this, "ImportPointsFileLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../lambda/importPointsFile.ts"),
      environment: {
        IMPORT_BUCKET_NAME: importBucket.bucketName,
      },
      bundling: {
        target: "node20",
        format: nodejs.OutputFormat.ESM,
      },
    });

    const importFileParserLambda = new nodejs.NodejsFunction(this, "ImportFileParserLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../lambda/importFileParser.ts"),
      bundling: {
        target: "node20",
        format: nodejs.OutputFormat.CJS,
      },
    });

    pointsTable.grantReadData(getPointsListLambda);
    pointsTable.grantReadData(getPointByIdLambda);
    pointsTable.grantReadWriteData(createPointLambda);
    pointsTable.grantReadWriteData(processUploadedPhotoLambda);

    importBucket.grantPut(getUploadUrlLambda, "uploads/*");
    importBucket.grantPut(importPointsFileLambda, "uploaded/*");
    importBucket.grantReadWrite(importFileParserLambda);
    importBucket.grantRead(getPointsListLambda, "uploads/*");
    importBucket.grantRead(getPointByIdLambda, "uploads/*");

    importBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(processUploadedPhotoLambda),
      { prefix: "uploads/" },
    );

    importBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParserLambda),
      { prefix: "uploaded/" },
    );

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

    const uploadResource = pointsApi.root.addResource("upload");
    uploadResource.addMethod("GET", new apigateway.LambdaIntegration(getUploadUrlLambda));

    const importResource = pointsApi.root.addResource("import");
    importResource.addMethod("GET", new apigateway.LambdaIntegration(importPointsFileLambda));

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

    new cdk.CfnOutput(this, "ImportApiBaseUrl", {
      value: pointsApi.url.replace(/\/$/, ""),
      description: "Base URL for import API",
    });

    new cdk.CfnOutput(this, "ImportBucketName", {
      value: importBucket.bucketName,
      description: "S3 bucket used for uploads and csv imports",
    });
  }
}