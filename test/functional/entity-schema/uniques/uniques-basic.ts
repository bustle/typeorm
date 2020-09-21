import "reflect-metadata";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../../utils/test-utils";
import {Connection} from "../../../../src/connection/Connection";
import {expect} from "chai";
import {PersonSchema} from "./entity/Person";

describe("entity-schema > uniques", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [<any>PersonSchema],
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should create an unique constraint with 2 columns", () => Promise.all(connections.map(async connection => {

        const queryRunner = connection.createQueryRunner();
        const table = await queryRunner.getTable("person");
        await queryRunner.release();

        expect(table!.uniques.length).to.be.equal(1);
        expect(table!.uniques[0].name).to.be.equal("UNIQUE_TEST");
        expect(table!.uniques[0].columnNames.length).to.be.equal(2);
        expect(table!.uniques[0].columnNames).to.deep.include.members(["FirstName", "LastName"]);

    })));

});
