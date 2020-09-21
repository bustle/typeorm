import "reflect-metadata";
import {PromiseUtils} from "../../../src";
import {Connection} from "../../../src";
import {UniqueMetadata} from "../../../src/metadata/UniqueMetadata";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Post} from "./entity/Post";
import {Teacher} from "./entity/Teacher";

describe("schema builder > change unique constraint", () => {

    let connections: Connection[];
    before(async () => {
        connections = await createTestingConnections({
            entities: [__dirname + "/entity/*{.js,.ts}"],
            schemaCreate: true,
            dropSchema: true,
        });
    });
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should correctly add new unique constraint", () => PromiseUtils.runInSequence(connections, async connection => {
        const teacherMetadata = connection.getMetadata(Teacher);
        const nameColumn = teacherMetadata.findColumnWithPropertyName("name")!;
        let uniqueMetadata: UniqueMetadata|undefined = undefined;

        uniqueMetadata = new UniqueMetadata({
            entityMetadata: teacherMetadata,
            columns: [nameColumn],
            args: {
                target: Teacher
            }
        });
        uniqueMetadata.build(connection.namingStrategy);
        teacherMetadata.uniques.push(uniqueMetadata);

        await connection.synchronize();

        const queryRunner = connection.createQueryRunner();
        const table = await queryRunner.getTable("teacher");
        await queryRunner.release();

        table!.uniques.length.should.be.equal(1);

        // revert changes
        teacherMetadata.uniques.splice(teacherMetadata.uniques.indexOf(uniqueMetadata!), 1);
    }));

    it("should correctly change unique constraint", () => PromiseUtils.runInSequence(connections, async connection => {
        const postMetadata = connection.getMetadata(Post);

        let uniqueMetadata = postMetadata.uniques.find(uq => uq.columns.length === 2);
        uniqueMetadata!.name = "changed_unique";

        await connection.synchronize();

        const queryRunner = connection.createQueryRunner();
        const table = await queryRunner.getTable("post");
        await queryRunner.release();

        const tableUnique = table!.uniques.find(unique => unique.columnNames.length === 2);
        tableUnique!.name!.should.be.equal("changed_unique");

        // revert changes
        uniqueMetadata = postMetadata.uniques.find(i => i.name === "changed_unique");
        uniqueMetadata!.name = connection.namingStrategy.uniqueConstraintName(table!, uniqueMetadata!.columns.map(c => c.databaseName));

    }));

    it("should correctly drop removed unique constraint", () => PromiseUtils.runInSequence(connections, async connection => {
        const postMetadata = connection.getMetadata(Post);

        const unique = postMetadata!.uniques.find(u => u.columns.length === 2);
        postMetadata!.uniques.splice(postMetadata!.uniques.indexOf(unique!), 1);

        await connection.synchronize();

        const queryRunner = connection.createQueryRunner();
        const table = await queryRunner.getTable("post");
        await queryRunner.release();

        table!.uniques.length.should.be.equal(1);
    }));

});
