// ...existing code...
return (
  <Form onSubmit={handleSubmit}>
    <FormGroup>
      <Label for="name">Name</Label>
      <Input
        type="text"
        name="name"
        id="name"
        value={formData.name}
        onChange={handleChange}
        required
      />
    </FormGroup>
    <FormGroup>
      <Label for="slug">Slug</Label>
      <Input
        type="text"
        name="slug"
        id="slug"
        value={formData.slug}
        onChange={handleChange}
        required
      />
    </FormGroup>
    <FormGroup>
      <Label for="status">Status</Label>
      <Input
        type="select"
        name="status"
        id="status"
        value={formData.status}
        onChange={handleChange}
        required
      >
        <option value="active">Active</option>
        <option value="planned">Planned</option>
        <option value="staging">Staging</option>
        <option value="decommissioning">Decommissioning</option>
        <option value="retired">Retired</option>
      </Input>
    </FormGroup>
    <FormGroup>
      <Label for="region">Region</Label>
      <Input
        type="select"
        name="region_id"
        id="region"
        value={formData.region_id || ''}
        onChange={handleChange}
      >
        <option value="">Select Region</option>
        {regions.map(region => (
          <option key={region.id} value={region.id}>{region.name}</option>
        ))}
      </Input>
    </FormGroup>
    <FormGroup>
      <Label for="siteGroup">Site Group</Label>
      <Input
        type="select"
        name="site_group_id"
        id="siteGroup"
        value={formData.site_group_id || ''}
        onChange={handleChange}
      >
        <option value="">Select Site Group</option>
        {siteGroups.map(group => (
          <option key={group.id} value={group.id}>{group.name}</option>
        ))}
      </Input>
    </FormGroup>
    <Button type="submit" color="primary">Submit</Button>
  </Form>
);
// ...existing code...
