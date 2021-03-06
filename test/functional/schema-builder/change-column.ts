import {expect} from "chai";
import "reflect-metadata";
import {Connection} from "../../../src";
import {PostgresDriver} from "../../../src/driver/postgres/PostgresDriver";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Post} from "./entity/Post";
import {PostVersion} from "./entity/PostVersion";

describe("schema builder > change column", () => {

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

    it("should correctly change column name", () => Promise.all(connections.map(async connection => {
        const postMetadata = connection.getMetadata(Post);
        const nameColumn = postMetadata.findColumnWithPropertyName("name")!;
        nameColumn.propertyName = "title";
        nameColumn.build(connection);

        await connection.synchronize();

        const queryRunner = connection.createQueryRunner();
        const postTable = await queryRunner.getTable("post");
        await queryRunner.release();

        expect(postTable!.findColumnByName("name")).to.be.undefined;
        postTable!.findColumnByName("title")!.should.be.exist;

        // revert changes
        nameColumn.propertyName = "name";
        nameColumn.build(connection);
    })));

    it("should correctly change column length", () => Promise.all(connections.map(async connection => {
        const postMetadata = connection.getMetadata(Post);
        const nameColumn = postMetadata.findColumnWithPropertyName("name")!;
        const textColumn = postMetadata.findColumnWithPropertyName("text")!;
        nameColumn.length = "500";
        textColumn.length = "300";

        await connection.synchronize();

        const queryRunner = connection.createQueryRunner();
        const postTable = await queryRunner.getTable("post");
        await queryRunner.release();

        postTable!.findColumnByName("name")!.length.should.be.equal("500");
        postTable!.findColumnByName("text")!.length.should.be.equal("300");

        postTable!.uniques.length.should.be.equal(2);

        // revert changes
        nameColumn.length = "255";
        textColumn.length = "255";
    })));

    it("should correctly change column type", () => Promise.all(connections.map(async connection => {

        const postMetadata = connection.getMetadata(Post);
        const versionColumn = postMetadata.findColumnWithPropertyName("version")!;
        versionColumn.type = "int";

        // in test we must manually change referenced column too, but in real sync, it changes automatically
        const postVersionMetadata = connection.getMetadata(PostVersion);
        const postVersionColumn = postVersionMetadata.findColumnWithPropertyName("post")!;
        postVersionColumn.type = "int";

        await connection.synchronize();

        const queryRunner = connection.createQueryRunner();
        const postVersionTable = await queryRunner.getTable("post_version");
        await queryRunner.release();

        postVersionTable!.foreignKeys.length.should.be.equal(1);

        // revert changes
        versionColumn.type = "varchar";
        postVersionColumn.type = "varchar";
    })));

    it("should correctly make column primary and generated", () => Promise.all(connections.map(async connection => {
        const postMetadata = connection.getMetadata(Post);
        const idColumn = postMetadata.findColumnWithPropertyName("id")!;
        const versionColumn = postMetadata.findColumnWithPropertyName("version")!;
        idColumn.isGenerated = true;
        idColumn.generationStrategy = "increment";

        versionColumn.isPrimary = true;

        await connection.synchronize();

        const queryRunner = connection.createQueryRunner();
        const postTable = await queryRunner.getTable("post");
        await queryRunner.release();

        postTable!.findColumnByName("id")!.isGenerated.should.be.true;
        postTable!.findColumnByName("id")!.generationStrategy!.should.be.equal("increment");

        postTable!.findColumnByName("version")!.isPrimary.should.be.true;

        // revert changes
        idColumn.isGenerated = false;
        idColumn.generationStrategy = undefined;
        versionColumn.isPrimary = false;
    })));

    it("should correctly change column `isGenerated` property when column is on foreign key", () => Promise.all(connections.map(async connection => {
        const teacherMetadata = connection.getMetadata("teacher");
        const idColumn = teacherMetadata.findColumnWithPropertyName("id")!;
        idColumn.isGenerated = false;
        idColumn.generationStrategy = undefined;

        await connection.synchronize();

        const queryRunner = connection.createQueryRunner();
        const teacherTable = await queryRunner.getTable("teacher");
        await queryRunner.release();

        teacherTable!.findColumnByName("id")!.isGenerated.should.be.false;
        expect(teacherTable!.findColumnByName("id")!.generationStrategy).to.be.undefined;

        // revert changes
        idColumn.isGenerated = true;
        idColumn.generationStrategy = "increment";

    })));

    it("should correctly change non-generated column on to uuid-generated column", () => Promise.all(connections.map(async connection => {
        const queryRunner = connection.createQueryRunner();

        if (connection.driver instanceof PostgresDriver)
            await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        const postMetadata = connection.getMetadata(Post);
        const idColumn = postMetadata.findColumnWithPropertyName("id")!;
        idColumn.isGenerated = true;
        idColumn.generationStrategy = "uuid";

        // depending on driver, we must change column and referenced column types
        if (connection.driver instanceof PostgresDriver) {
            idColumn.type = "uuid";
        }

        await connection.synchronize();

        const postTable = await queryRunner.getTable("post");
        await queryRunner.release();

        if (connection.driver instanceof PostgresDriver) {
            postTable!.findColumnByName("id")!.isGenerated.should.be.true;
            postTable!.findColumnByName("id")!.generationStrategy!.should.be.equal("uuid");

        } else {
            // other driver does not natively supports uuid type
            postTable!.findColumnByName("id")!.isGenerated.should.be.false;
            expect(postTable!.findColumnByName("id")!.generationStrategy).to.be.undefined;
        }

        // revert changes
        idColumn.isGenerated = false;
        idColumn.generationStrategy = undefined;
        idColumn.type = "int";
        postMetadata.generatedColumns.splice(postMetadata.generatedColumns.indexOf(idColumn), 1);
        postMetadata.hasUUIDGeneratedColumns = false;

    })));

    it("should correctly change generated column generation strategy", () => Promise.all(connections.map(async connection => {
        const teacherMetadata = connection.getMetadata("teacher");
        const studentMetadata = connection.getMetadata("student");
        const idColumn = teacherMetadata.findColumnWithPropertyName("id")!;
        const teacherColumn = studentMetadata.findColumnWithPropertyName("teacher")!;
        idColumn.generationStrategy = "uuid";

        // depending on driver, we must change column and referenced column types
        if (connection.driver instanceof PostgresDriver) {
            idColumn.type = "uuid";
            teacherColumn.type = "uuid";
        }

        await connection.synchronize();

        const queryRunner = connection.createQueryRunner();
        const teacherTable = await queryRunner.getTable("teacher");
        await queryRunner.release();

        if (connection.driver instanceof PostgresDriver) {
            teacherTable!.findColumnByName("id")!.isGenerated.should.be.true;
            teacherTable!.findColumnByName("id")!.generationStrategy!.should.be.equal("uuid");

        } else {
            // other driver does not natively supports uuid type
            teacherTable!.findColumnByName("id")!.isGenerated.should.be.false;
            expect(teacherTable!.findColumnByName("id")!.generationStrategy).to.be.undefined;
        }

        // revert changes
        idColumn.isGenerated = true;
        idColumn.generationStrategy = "increment";
        idColumn.type = "int";
        teacherColumn.type = "int";

    })));

});
