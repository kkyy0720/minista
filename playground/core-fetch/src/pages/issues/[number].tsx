export async function getStaticData() {
  const apiUrl = "https://api.github.com/repos/qrac/minista/issues"
  const apiParamsQuery = "?state=all&creator=qrac&per_page=5"
  const response = await fetch(apiUrl + apiParamsQuery)
  const data = await response.json()
  return data.map((item: PageIssuesTemplateProps) => ({
    props: item,
    paths: { number: item.number },
  }))
}

type PageIssuesTemplateProps = {
  title: string
  body: string
  number: number
}

export default function (props: PageIssuesTemplateProps) {
  return (
    <>
      <h1>{props.title}</h1>
      <div>{props.body}</div>
    </>
  )
}
