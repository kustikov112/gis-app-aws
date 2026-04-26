#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { Module02HostingStack } from "../lib/module-02-hosting-stack";

const app = new cdk.App();
new Module02HostingStack(app, "MapPointsModule02HostingStack", {});
