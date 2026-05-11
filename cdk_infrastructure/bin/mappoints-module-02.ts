#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { Module02HostingStack } from "../lib/module-02-hosting-stack";
import { Module03PointServiceStack } from "../lib/module-03-point-service-stack";

const app = new cdk.App();
new Module02HostingStack(app, "MapPointsModule02HostingStack", {});
new Module03PointServiceStack(app, "MapPointsModule03PointServiceStack", {});
