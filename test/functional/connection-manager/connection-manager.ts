import "reflect-metadata";
import {expect} from "chai";
import {setupSingleTestingConnection} from "../../utils/test-utils";
import {ConnectionManager} from "../../../src/connection/ConnectionManager";
import {PrimaryGeneratedColumn} from "../../../src/decorator/columns/PrimaryGeneratedColumn";
import {Column} from "../../../src/decorator/columns/Column";
import {Entity} from "../../../src/decorator/entity/Entity";

describe("ConnectionManager", () => {

    @Entity()
    class Post {

        @PrimaryGeneratedColumn()
        id: number;

        @Column()
        title: string;

        constructor(id: number, title: string) {
            this.id = id;
            this.title = title;
        }
    }

    describe("create connection options", function() {

        it("should not drop the database if dropSchema was not specified", async () => {
            const options = setupSingleTestingConnection("postgres", {
                name: "myPostgresConnection",
                schemaCreate: true,
                entities: [Post]
            });
            if (!options)
                return;

            const connectionManager = new ConnectionManager();

            // create connection, save post and close connection
            let connection = await connectionManager.create(options).connect();
            const post = new Post(1, "Hello post");
            await connection.manager.save(post);
            await connection.close();

            // recreate connection and find previously saved post
            connection = await connectionManager.create(options).connect();
            const loadedPost = (await connection.manager.findOne(Post, 1))!;
            loadedPost.should.be.instanceof(Post);
            loadedPost.should.be.eql({ id: 1, title: "Hello post" });
            await connection.close();
        });

        it("should drop the database if dropSchema was set to true (mysql)", async () => {
            const options = setupSingleTestingConnection("postgres", {
                name: "myPostgresConnection",
                schemaCreate: true,
                dropSchema: true,
                entities: [Post]
            });
            if (!options)
                return;

            const connectionManager = new ConnectionManager();

            // create connection, save post and close connection
            let connection = await connectionManager.create(options).connect();
            const post = new Post(1, "Hello post");
            await connection.manager.save(post);
            await connection.close();

            // recreate connection and find previously saved post
            connection = await connectionManager.create(options).connect();
            const loadedPost = await connection.manager.findOne(Post, 1);
            expect(loadedPost).to.be.undefined;
            await connection.close();
         });

    });

});
