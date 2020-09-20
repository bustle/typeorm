import {PostgresConnectionOptions} from "../driver/postgres/PostgresConnectionOptions";


/**
 * ConnectionOptions is an interface with settings and options for specific connection.
 * Options contain database and other connection-related settings.
 * Consumer must provide connection options for each of your connections.
 */
export type ConnectionOptions = PostgresConnectionOptions;
