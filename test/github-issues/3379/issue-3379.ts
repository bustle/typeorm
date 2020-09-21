import "reflect-metadata";
import {PostgresDriver} from "../../../src/driver/postgres/PostgresDriver";
import {createTestingConnections, closeTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Connection, Table} from "../../../src";

describe("github issues > #3379 Migration will keep create and drop indexes if index name is the same across tables", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"]
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should not recreate indices", () => Promise.all(connections.map(async connection => {

        const queryRunner = connection.createQueryRunner();

        let postTableName: string = "post";

        if (connection.driver instanceof PostgresDriver) {
            postTableName = "testSchema.post";
            await queryRunner.createSchema("testSchema", true);

        }

        await queryRunner.createTable(new Table({
            name: postTableName,
            columns: [
                {
                    name: "id",
                    type: "int",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment"
                },
                {
                    name: "name",
                    type: "varchar",
                }
            ],
            indices: [{ name: "name_index", columnNames: ["name"] }]
        }), true);

        await queryRunner.release();

        const sqlInMemory = await connection.driver.createSchemaBuilder().log();
        sqlInMemory.upQueries.length.should.be.equal(0);
    })));

});
