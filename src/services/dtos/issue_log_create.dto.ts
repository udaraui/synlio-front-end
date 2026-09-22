export interface CreateIssueLogDTO{
    email?:string
    user_name?:string
    property:string
    previous_value:string
    new_value:string
    service_request_id:number
}