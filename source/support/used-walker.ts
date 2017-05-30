/**
 * @license Copyright © 2017 Nicholas Jamieson. All Rights Reserved.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/cartant/rxjs-tslint-rules
 */

import * as Lint from "tslint";
import * as ts from "typescript";
import { AddedWalker } from "./added-walker";
import { knownObservables, knownOperators } from "./knowns";

export class UsedWalker extends AddedWalker {

    public usedObservables: { [key: string]: ts.Node[] } = {};
    public usedOperators: { [key: string]: ts.Node[] } = {};

    protected visitCallExpression(node: ts.CallExpression): void {

        node.forEachChild((child) => {

            if (child.kind === ts.SyntaxKind.PropertyAccessExpression) {

                const propertyAccessExpression = child as ts.PropertyAccessExpression;
                const name = propertyAccessExpression.name.getText();
                const typeChecker = this.getTypeChecker();
                const type = typeChecker.getTypeAtLocation(propertyAccessExpression.expression);

                if (isReferenceType(type)) {
                    if (knownOperators[name] && couldBeObservableType(type.target)) {
                        this.add(this.usedOperators, name, propertyAccessExpression.name);
                    }
                } else {
                    if (knownObservables[name] && couldBeObservableType(type)) {
                        this.add(this.usedObservables, name, propertyAccessExpression.name);
                    }
                }
            }
        });

        super.visitCallExpression(node);
    }
}

function couldBeObservableType(type: ts.Type): boolean {

    if (isReferenceType(type)) {
        type = type.target;
    }

    if (isObservableType(type)) {
        return true;
    }

    if (isUnionType(type)) {
        return type.types.some(couldBeObservableType);
    }

    const baseTypes = type.getBaseTypes();
    return Boolean(baseTypes) && baseTypes.some(couldBeObservableType);
}

function isObservableType(type: ts.Type): boolean {

    return Boolean(type.symbol) && type.symbol.name === "Observable";
}

function isReferenceType(type: ts.Type): type is ts.TypeReference {

    return Lint.isTypeFlagSet(type, ts.TypeFlags.Object) &&
        Lint.isObjectFlagSet(type as ts.ObjectType, ts.ObjectFlags.Reference);
}

function isUnionType(type: ts.Type): type is ts.UnionType {

    return Lint.isTypeFlagSet(type, ts.TypeFlags.Union);
}